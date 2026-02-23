using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.OpenApi.Models;
using Serilog;
using ATTENDING.Application;
using ATTENDING.Infrastructure;
using ATTENDING.Orders.Api.Hubs;
using ATTENDING.Orders.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithEnvironmentName()
    .Enrich.WithProperty("Application", "ATTENDING.Orders.Api")
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// Add services
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddInfrastructureHealthChecks(builder.Configuration);

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
        options.Configuration.ChannelPrefix = new StackExchange.Redis.RedisChannel("attending:signalr:", StackExchange.Redis.RedisChannel.PatternMode.Auto);
    });
    Log.Information("SignalR Redis backplane enabled");
}

// Register SignalR notification service
builder.Services.AddScoped<IClinicalNotificationService, ClinicalNotificationService>();

// Add controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// ============================================================
// Authentication
// Development: bypass JWT validation entirely
// Production: Azure AD B2C JWT bearer
// ============================================================
var devBypass = builder.Configuration.GetValue<bool>("Authentication:DevBypass");

if (devBypass && builder.Environment.IsDevelopment())
{
    Log.Warning("⚠️  Authentication bypass enabled — all requests treated as authenticated (dev only)");
    
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
            options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;

                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };
        });
}

builder.Services.AddAuthorization();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
            ?? new[] { "http://localhost:3000", "http://localhost:3001", "http://localhost:3002" };
        
        policy.WithOrigins(origins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials(); // Required for SignalR
    });
});

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
    {
        c.IncludeXmlComments(xmlPath);
    }
});

var app = builder.Build();

// Configure middleware pipeline
if (app.Environment.IsDevelopment())
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

// Global exception handling
app.UseMiddleware<ExceptionMiddleware>();

// Request logging
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
        diagnosticContext.Set("UserAgent", httpContext.Request.Headers["User-Agent"].ToString());
        diagnosticContext.Set("ClientIP", httpContext.Connection.RemoteIpAddress?.ToString());
        
        if (httpContext.User.Identity?.IsAuthenticated == true)
        {
            diagnosticContext.Set("UserId", httpContext.User.FindFirst("sub")?.Value);
        }
    };
});

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// Audit middleware (after auth)
app.UseMiddleware<AuditMiddleware>();

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

// ============================================================
// Dev authentication handler — auto-authenticates all requests
// ============================================================
public class DevAuthHandler : Microsoft.AspNetCore.Authentication.AuthenticationHandler<
    Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions>
{
    public DevAuthHandler(
        Microsoft.Extensions.Options.IOptionsMonitor<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        System.Text.Encodings.Web.UrlEncoder encoder)
        : base(options, logger, encoder) { }

    protected override Task<Microsoft.AspNetCore.Authentication.AuthenticateResult> HandleAuthenticateAsync()
    {
        // Create a dev identity with provider claims
        var claims = new[]
        {
            new System.Security.Claims.Claim("sub", "00000000-0000-0000-0000-000000000001"),
            new System.Security.Claims.Claim("oid", "00000000-0000-0000-0000-000000000001"),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, "scott.isbell@attending.ai"),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, "Dr. Scott Isbell"),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "Provider"),
        };

        var identity = new System.Security.Claims.ClaimsIdentity(claims, "DevBypass");
        var principal = new System.Security.Claims.ClaimsPrincipal(identity);
        var ticket = new Microsoft.AspNetCore.Authentication.AuthenticationTicket(principal, "DevBypass");

        return Task.FromResult(Microsoft.AspNetCore.Authentication.AuthenticateResult.Success(ticket));
    }
}

// Expose Program for WebApplicationFactory in integration tests
public partial class Program { }
