using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.RateLimiting;
using ATTENDING.Infrastructure.Data;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Application.Interfaces;

namespace ATTENDING.Integration.Tests.Fixtures;

/// <summary>
/// Custom WebApplicationFactory that:
/// - Swaps SQL Server for InMemory database (isolated per factory instance)
/// - Replaces JWT bearer auth with a test auth handler that auto-authenticates
///   all requests as a dev provider identity (mirrors DevAuthHandler in dev mode)
/// - Replaces the audit service with an inspectable stub
///
/// Each factory instance gets its own unique in-memory database so tests are isolated.
/// </summary>
public class AttendingWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // ---- Database: replace SQL Server with InMemory ----
            var dbContextOptionsDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AttendingDbContext>));
            if (dbContextOptionsDescriptor != null)
                services.Remove(dbContextOptionsDescriptor);

            var dbContextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(AttendingDbContext));
            if (dbContextDescriptor != null)
                services.Remove(dbContextDescriptor);

            // Each factory instance gets a unique DB name to prevent test pollution
            var dbName = $"AttendingApiTest_{Guid.NewGuid():N}";
            services.AddDbContext<AttendingDbContext>(options =>
            {
                options.UseInMemoryDatabase(dbName);

                // NOTE: We intentionally do NOT wire the AuditSaveChangesInterceptor
                // for InMemory tests. The interceptor modifies entities DURING the
                // EF Core save pipeline, which causes DbUpdateConcurrencyException
                // with the InMemory provider ("entity does not exist in store").
                //
                // Instead, AttendingDbContext.UpdateAuditFields() handles all audit
                // field assignment (CreatedBy, OrganizationId, soft-delete) BEFORE
                // base.SaveChangesAsync() is called, which InMemory handles correctly.
                //
                // The interceptor remains active in production (SQL Server) as a
                // safety net for code paths that bypass IUnitOfWork.
            });

            services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<AttendingDbContext>());

            // ---- Authentication: replace JWT bearer with always-authenticated test handler ----
            // Remove all existing authentication scheme descriptors
            var authDescriptors = services
                .Where(d => d.ServiceType == typeof(IAuthenticationSchemeProvider) ||
                            d.ServiceType == typeof(IAuthenticationHandlerProvider) ||
                            d.ServiceType == typeof(AuthenticationOptions))
                .ToList();
            // Note: we use AddAuthentication().AddScheme to override cleanly

            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, options => { });

            // ---- Rate limiting: disable in tests to prevent throttle interference ----
            // Remove all existing RateLimiterOptions configurations registered by Program.cs
            // so we can re-register named policies without "already exists" collisions.
            var rateLimitDescriptors = services
                .Where(d => d.ServiceType == typeof(IConfigureOptions<RateLimiterOptions>) ||
                            d.ServiceType == typeof(IPostConfigureOptions<RateLimiterOptions>))
                .ToList();
            foreach (var descriptor in rateLimitDescriptors)
                services.Remove(descriptor);

            // Now add a clean no-op rate limiter that never rejects
            services.AddRateLimiter(options =>
            {
                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(_ =>
                    RateLimitPartition.GetNoLimiter("test"));

                options.AddPolicy("tenant-api",    _ => RateLimitPartition.GetNoLimiter("test"));
                options.AddPolicy("clinical-ops",  _ => RateLimitPartition.GetNoLimiter("test"));
                options.AddPolicy("auth",          _ => RateLimitPartition.GetNoLimiter("test"));
                options.AddPolicy("health",        _ => RateLimitPartition.GetNoLimiter("test"));
            });

            // ---- Notification service: replace with no-op stub (no real SignalR in tests) ----
            var notifDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IClinicalNotificationService));
            if (notifDescriptor != null)
                services.Remove(notifDescriptor);
            services.AddScoped<IClinicalNotificationService, StubClinicalNotificationService>();

            // ---- Audit service: replace with inspectable stub ----
            var auditDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IAuditService));
            if (auditDescriptor != null)
                services.Remove(auditDescriptor);
            services.AddScoped<IAuditService, StubAuditService>();

            // ---- Health checks: remove SQL Server health check (no connection string in tests) ----
            var healthCheckDescriptors = services
                .Where(d => d.ServiceType == typeof(Microsoft.Extensions.Diagnostics.HealthChecks.IHealthCheck) ||
                            d.ServiceType == typeof(Microsoft.Extensions.Options.IConfigureOptions<Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckServiceOptions>))
                .ToList();
            foreach (var descriptor in healthCheckDescriptors)
                services.Remove(descriptor);

            // Re-add a basic health check that works without SQL Server
            services.AddHealthChecks();

            // ---- Background services: remove hosted services that crash the test host ----
            // ClinicalSchedulerService runs distributed-lock-guarded background loops
            // that throw TaskCanceledException on host shutdown, which the default
            // BackgroundServiceExceptionBehavior.StopHost treats as fatal.
            var hostedServiceDescriptors = services
                .Where(d => d.ServiceType == typeof(IHostedService))
                .ToList();
            foreach (var descriptor in hostedServiceDescriptors)
                services.Remove(descriptor);
        });
    }
}

/// <summary>
/// Test authentication handler — authenticates every request as a provider identity.
/// Mirrors the DevAuthHandler in Program.cs but available in the Testing environment.
///
/// Claims match what the application's [Authorize] policies expect:
/// - sub / oid: provider GUID
/// - email, name: display identity
/// - role: "Provider"
/// </summary>
public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "TestAuth";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim("sub",       "00000000-0000-0000-0000-000000000001"),
            new Claim("oid",       "00000000-0000-0000-0000-000000000001"),
            new Claim("tenant_id", "00000000-0000-0000-0000-000000000001"), // Tenant isolation
            new Claim(ClaimTypes.NameIdentifier, "00000000-0000-0000-0000-000000000001"),
            new Claim(ClaimTypes.Email, "test.provider@attending-test.local"),
            new Claim(ClaimTypes.Name,  "Dr. Test Provider"),
            new Claim(ClaimTypes.Role,  "Provider"),
        };

        var identity  = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket    = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
