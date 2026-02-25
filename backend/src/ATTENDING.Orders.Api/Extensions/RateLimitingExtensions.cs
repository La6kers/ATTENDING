using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

namespace ATTENDING.Orders.Api.Extensions;

/// <summary>
/// Rate limiting configuration for the ATTENDING API.
///
/// Policies (applied via [EnableRateLimiting("policy-name")] or globally):
///
///   "tenant-api"   - Per-tenant sliding window: 300 req/min (normal operations)
///   "auth"         - Per-IP fixed window: 10 req/min (login/token endpoints)
///   "clinical-ops" - Per-tenant token bucket: 60 req/min (state-changing clinical writes)
///   "health"       - Per-IP fixed window: 60 req/min (health check endpoints)
///
/// Tenants are identified by the "X-Tenant-Id" claim ("oid") from the JWT.
/// When a tenant ID is not resolvable (unauthenticated), falls back to remote IP.
/// </summary>
public static class RateLimitingExtensions
{
    public static IServiceCollection AddAttendingRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            // ----------------------------------------------------------------
            // Rejection response: 429 Too Many Requests with Retry-After header
            // ----------------------------------------------------------------
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.OnRejected = async (context, cancellationToken) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter =
                        ((int)retryAfter.TotalSeconds).ToString(System.Globalization.CultureInfo.InvariantCulture);
                }

                context.HttpContext.Response.ContentType = "application/json";
                await context.HttpContext.Response.WriteAsync(
                    """{"error":"rate_limit_exceeded","message":"Too many requests. Please slow down and retry after the indicated delay."}""",
                    cancellationToken: cancellationToken);
            };

            // ----------------------------------------------------------------
            // tenant-api: General API access — 300 requests per tenant per minute
            // Sliding window gives smooth traffic distribution vs hard cutoffs.
            // ----------------------------------------------------------------
            options.AddPolicy("tenant-api", httpContext =>
            {
                var tenantKey = ResolveTenantKey(httpContext);
                return RateLimitPartition.GetSlidingWindowLimiter(tenantKey, _ =>
                    new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit = 300,
                        Window = TimeSpan.FromMinutes(1),
                        SegmentsPerWindow = 6,   // 10-second segments
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 10
                    });
            });

            // ----------------------------------------------------------------
            // clinical-ops: State-changing clinical writes — 60 req/min per tenant
            // Token bucket smooths burst writes while maintaining steady-state limit.
            // Applied to: POST/PUT/DELETE on orders, assessments, encounters.
            // ----------------------------------------------------------------
            options.AddPolicy("clinical-ops", httpContext =>
            {
                var tenantKey = ResolveTenantKey(httpContext);
                return RateLimitPartition.GetTokenBucketLimiter(tenantKey, _ =>
                    new TokenBucketRateLimiterOptions
                    {
                        TokenLimit = 20,           // burst capacity
                        ReplenishmentPeriod = TimeSpan.FromSeconds(20),
                        TokensPerPeriod = 20,       // refill 20 every 20s = 60/min steady state
                        AutoReplenishment = true,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 5
                    });
            });

            // ----------------------------------------------------------------
            // auth: Authentication endpoints — 10 req/min per IP
            // Hard fixed window prevents credential stuffing.
            // ----------------------------------------------------------------
            options.AddPolicy("auth", httpContext =>
            {
                var ipKey = $"auth:{httpContext.Connection.RemoteIpAddress}";
                return RateLimitPartition.GetFixedWindowLimiter(ipKey, _ =>
                    new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0    // no queue — reject immediately on auth endpoints
                    });
            });

            // ----------------------------------------------------------------
            // Global default: all undecorated routes use tenant-api policy
            // ----------------------------------------------------------------
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
            {
                var tenantKey = ResolveTenantKey(httpContext);
                return RateLimitPartition.GetSlidingWindowLimiter(tenantKey, _ =>
                    new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit = 300,
                        Window = TimeSpan.FromMinutes(1),
                        SegmentsPerWindow = 6,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 10
                    });
            });

            // ----------------------------------------------------------------
            // health: Health check endpoints — 60 req/min per IP
            // Allows monitoring tools without consuming tenant quota.
            // ----------------------------------------------------------------
            options.AddPolicy("health", httpContext =>
            {
                var ipKey = $"health:{httpContext.Connection.RemoteIpAddress}";
                return RateLimitPartition.GetFixedWindowLimiter(ipKey, _ =>
                    new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 60,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    });
            });
        });

        return services;
    }

    // ----------------------------------------------------------------
    // Tenant key resolution
    // Priority: JWT "oid" claim → JWT "sub" claim → Remote IP (unauthenticated)
    // ----------------------------------------------------------------
    private static string ResolveTenantKey(HttpContext httpContext)
    {
        if (httpContext.User.Identity?.IsAuthenticated == true)
        {
            var tenantId = httpContext.User.FindFirst("oid")?.Value
                        ?? httpContext.User.FindFirst("sub")?.Value;

            if (!string.IsNullOrWhiteSpace(tenantId))
                return $"tenant:{tenantId}";
        }

        // Fallback: IP-based partition (handles pre-auth requests)
        return $"ip:{httpContext.Connection.RemoteIpAddress}";
    }
}
