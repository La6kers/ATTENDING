using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.OpenApi.Models;
using Serilog;
using ATTENDING.Application;
using ATTENDING.Infrastructure;
using ATTENDING.Orders.Api.Hubs;
using ATTENDING.Orders.Api.Extensions;
using ATTENDING.Orders.Api.Middleware;
using ATTENDING.Orders.Api.Services;
using System.Security.Claims;
using ATTENDING.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// ============================================================
// Azure Key Vault — Production secrets management
// Supplements appsettings.Production.json placeholders with
// real secrets from Key Vault. Only active when KV URI is set.
// ============================================================
var keyVaultUri = builder.Configuration["AzureKeyVault:Uri"];
if (!string.IsNullOrWhiteSpace(keyVaultUri))
{
    builder.Configuration.AddAzureKeyVault(
        new Uri(keyVaultUri),
        new Azure.Identity.DefaultAzureCredential());
    Log.Information("Azure Key Vault configuration source active: {Uri}", keyVaultUri);
}

// Configure Serilog with PHI-safe logging
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithEnvironmentName()
    .Enrich.WithProperty("Application", "ATTENDING.Orders.Api")
    .Destructure.With<PhiMaskingDestructuringPolicy>()   // masks PHI in structured log properties
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// Add services
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddInfrastructureHealthChecks(builder.Configuration);

// Background service exceptions should NOT stop the host — clinical system must stay up.
// ClinicalSchedulerService catches and logs errors per-job internally (see ExecuteAsync),
// so unhandled exceptions here would indicate a scheduler-level bug. Ignore keeps the host
// alive; Serilog will capture the exception for investigation.
builder.Services.Configure<HostOptions>(options =>
{
    options.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});

// Add SignalR with Redis backplane for multi-instance scaling
var signalRBuilder = builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});

var signalRRedis = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrWhiteSpace(signalRRedis))
{
    signalRBuilder.AddStackExchangeRedis(signalRRedis, options =>
    {
        options.Configuration.ChannelPrefix = new StackExchange.Redis.RedisChannel(
            "attending:signalr:", StackExchange.Redis.RedisChannel.PatternMode.Auto);
    });
    Log.Information("SignalR Redis backplane enabled");
}

// Register SignalR notification service (implements Application.Interfaces.IClinicalNotificationService)
builder.Services.AddScoped<ATTENDING.Application.Interfaces.IClinicalNotificationService,
    SignalRClinicalNotificationService>();

// Current user context for audit trails
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ATTENDING.Domain.Interfaces.ICurrentUserService, CurrentUserService>();

// Request body size limit (5 MB max — prevents abuse, sufficient for clinical payloads)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 5 * 1024 * 1024;
    options.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);
    options.AddServerHeader = false; // Don't expose server version
});

// Add controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// ============================================================
// Authentication
// Development: bypass JWT validation entirely (DevAuthHandler in Services/DevAuthHandler.cs)
// Production: Azure AD B2C JWT bearer
// ============================================================
var devBypass = builder.Configuration.GetValue<bool>("Authentication:DevBypass");

if (devBypass && builder.Environment.IsProduction())
    throw new InvalidOperationException("Authentication:DevBypass must not be enabled in production.");

if (devBypass && !builder.Environment.IsProduction() && builder.Environment.IsDevelopment())
{
    Log.Warning("Authentication bypass enabled — all requests treated as authenticated (dev only)");

    builder.Services.AddAuthentication("DevBypass")
        .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, DevAuthHandler>(
            "DevBypass", options => { });
}
else
{
    builder.Services.AddAuthentication()
        .AddJwtBearer(options =>
        {
            options.Authority = builder.Configuration["AzureAdB2C:Authority"];
            options.Audience = builder.Configuration["AzureAdB2C:ClientId"];

            // For SignalR, allow token from query string
            // NOTE: The Azure AD B2C tenant's conditional access policy should also
            // enforce MFA at the identity provider level for provider users.
            options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;

                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                        context.Token = accessToken;

                    return Task.CompletedTask;
                },
                OnTokenValidated = context =>
                {
                    // Verify MFA was completed for provider roles
                    var roles = context.Principal?.FindAll(ClaimTypes.Role)?.Select(c => c.Value);
                    if (roles?.Contains("Provider") == true)
                    {
                        var acr = context.Principal?.FindFirst("acr")?.Value;
                        if (acr != "b2c_1a_signup_signin_mfa" && acr != "possessionorinherence")
                        {
                            context.Fail("MFA is required for provider access.");
                        }
                    }
                    return Task.CompletedTask;
                }
            };
        });
}

builder.Services.AddAuthorization();

// Add CORS
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (corsOrigins == null || corsOrigins.Length == 0)
{
    if (builder.Environment.IsProduction())
        throw new InvalidOperationException("CORS origins must be configured in production.");
    corsOrigins = new[] { "http://localhost:3000", "http://localhost:3001", "http://localhost:3002" };
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials(); // Required for SignalR
    });
});

// Rate limiting
builder.Services.AddAttendingRateLimiting();

// Performance SLA monitoring
builder.Services.AddPerformanceMonitoring(builder.Configuration);

// OpenTelemetry distributed tracing
builder.Services.AddAttendingOpenTelemetry(builder.Configuration, builder.Environment);

// Add response caching
builder.Services.AddResponseCaching();

// Add memory cache
builder.Services.AddMemoryCache();

// Add Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ATTENDING AI - Orders API",
        Version = "v1",
        Description = "Clinical orders management API for ATTENDING AI platform. " +
                      "Provides endpoints for lab orders, imaging, medications, referrals, and patient assessments.",
        Contact = new OpenApiContact
        {
            Name = "ATTENDING AI Team",
            Email = "support@attendingai.com",
            Url = new Uri("https://attendingai.com")
        },
        License = new OpenApiLicense
        {
            Name = "Proprietary",
            Url = new Uri("https://attendingai.com/license")
        }
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
        c.IncludeXmlComments(xmlPath);
});

var app = builder.Build();

// Initialize database (migrate + seed)
await DatabaseInitializer.InitializeAsync(app.Services, app.Environment);

// Configure middleware pipeline
if (app.Environment.IsDevelopment() || app.Environment.EnvironmentName == "Testing")
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "ATTENDING AI Orders API v1");
        c.RoutePrefix = string.Empty;
        c.DocumentTitle = "ATTENDING AI - API Documentation";
        c.EnableDeepLinking();
        c.DisplayRequestDuration();
    });
}

// Forwarded headers — required when behind Azure Front Door / App Gateway / load balancer.
// Without this, HttpContext.Connection.RemoteIpAddress returns the proxy IP, not the client IP,
// breaking rate limiting, audit logging, and IP-based security controls.
var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
                     | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto,
};

if (!app.Environment.IsDevelopment())
{
    // In production, only accept forwarded headers from known proxies.
    // Azure Front Door service tag IPs should be loaded from configuration.
    // See: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-faq#how-do-i-lock-down-the-access-to-my-backend-to-only-azure-front-door-
    var trustedProxies = app.Configuration.GetSection("ForwardedHeaders:TrustedProxyCIDRs").Get<string[]>();
    if (trustedProxies?.Length > 0)
    {
        foreach (var entry in trustedProxies)
        {
            // Support both plain IPs ("10.0.0.1") and CIDR notation ("10.0.0.0/24")
            if (entry.Contains('/'))
            {
                // CIDR — add as a trusted network
                var parts = entry.Split('/');
                if (System.Net.IPAddress.TryParse(parts[0], out var networkIp)
                    && int.TryParse(parts[1], out var prefixLength))
                {
                    forwardedHeadersOptions.KnownNetworks.Add(
                        new Microsoft.AspNetCore.HttpOverrides.IPNetwork(networkIp, prefixLength));
                }
            }
            else if (System.Net.IPAddress.TryParse(entry, out var ip))
            {
                forwardedHeadersOptions.KnownProxies.Add(ip);
            }
        }
        Log.Information("ForwardedHeaders restricted to {Count} trusted proxies", trustedProxies.Length);
    }
    else
    {
        if (app.Environment.IsProduction())
        {
            Log.Error("ForwardedHeaders: No TrustedProxyCIDRs configured — accepting from any proxy. " +
                       "Set ForwardedHeaders:TrustedProxyCIDRs in appsettings.Production.json before go-live.");
            throw new InvalidOperationException(
                "ForwardedHeaders:TrustedProxyCIDRs must be configured in production. " +
                "Without trusted proxies, rate limiting and audit logging use proxy IPs instead of client IPs.");
        }
        else
        {
            Log.Warning("ForwardedHeaders: No TrustedProxyCIDRs configured — accepting from any proxy. " +
                         "Set ForwardedHeaders:TrustedProxyCIDRs in appsettings.Production.json before go-live.");
        }
    }
}

app.UseForwardedHeaders(forwardedHeadersOptions);

// Security headers (first in pipeline after forwarded headers)
app.UseMiddleware<SecurityHeadersMiddleware>();

// Correlation ID
app.UseMiddleware<CorrelationIdMiddleware>();

// Performance SLA monitoring (after correlation ID so breaches include the ID)
app.UseMiddleware<PerformanceMonitoringMiddleware>();

// API version header
app.UseMiddleware<ApiVersionHeaderMiddleware>();

// Global exception handling
app.UseMiddleware<ExceptionMiddleware>();

// Request logging (PHI-safe: path only, no query string, no PHI fields)
app.UseSerilogRequestLogging(options =>
{
    options.GetLevel = (httpContext, elapsed, ex) =>
        ex != null                              ? Serilog.Events.LogEventLevel.Error :
        httpContext.Response.StatusCode >= 500  ? Serilog.Events.LogEventLevel.Error :
        httpContext.Response.StatusCode >= 400  ? Serilog.Events.LogEventLevel.Warning :
                                                  Serilog.Events.LogEventLevel.Information;

    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        // Explicitly use only Path (no QueryString) — PHI may appear in query params
        diagnosticContext.Set("RequestPath",  httpContext.Request.Path.Value);
        diagnosticContext.Set("RequestHost",  httpContext.Request.Host.Value);
        diagnosticContext.Set("UserAgent",    httpContext.Request.Headers["User-Agent"].ToString());
        diagnosticContext.Set("ClientIP",     httpContext.Connection.RemoteIpAddress?.ToString());
        diagnosticContext.Set("ResponseSize", httpContext.Response.ContentLength);

        if (httpContext.User.Identity?.IsAuthenticated == true)
        {
            // Log tenant/user IDs (not PHI — these are provider identifiers, not patient data)
            var tenantId = httpContext.User.FindFirst("oid")?.Value
                        ?? httpContext.User.FindFirst("sub")?.Value;
            diagnosticContext.Set("TenantId", tenantId);
        }

        if (httpContext.Items.TryGetValue("CorrelationId", out var correlationId))
            diagnosticContext.Set("CorrelationId", correlationId?.ToString());
    };
});

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// Rate limiting
app.UseRateLimiter();

// Idempotency protection for clinical order creation (after auth, before audit)
app.UseMiddleware<IdempotencyMiddleware>();

// Audit middleware (after auth)
app.UseMiddleware<AuditMiddleware>();

// Prevent response caching for API routes to avoid cross-tenant PHI leakage
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        context.Response.Headers["Pragma"] = "no-cache";
    }
    await next();
});

// Response caching
app.UseResponseCaching();

// Map controllers
app.MapControllers();

// Map SignalR hub
app.MapHub<ClinicalNotificationHub>("/hubs/notifications");

// Health checks
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("db"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});

// Prometheus metrics endpoint — scraped by monitoring infrastructure
// Only register if OpenTelemetry MeterProvider was configured (skipped in Testing)
if (app.Services.GetService<OpenTelemetry.Metrics.MeterProvider>() is not null)
{
    app.MapPrometheusScrapingEndpoint("/metrics");
}

// Startup logging
Log.Information("==============================================");
Log.Information("ATTENDING AI - Orders API");
Log.Information("Environment: {Environment}", app.Environment.EnvironmentName);
Log.Information("==============================================");

try
{
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// Expose Program for WebApplicationFactory in integration tests
public partial class Program { }
