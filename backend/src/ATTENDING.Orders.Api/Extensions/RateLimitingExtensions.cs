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
            //
            // Clinical justification: A busy provider dashboard polls ~6 endpoints
            // every 10 s (assessments, notifications, labs, imaging, encounters,
            // prescriptions) = ~36 req/min per provider.  With up to 5 concurrent
            // providers per tenant, peak steady-state is ~180 req/min.  The 300
            // limit provides ~67% headroom for bursts (page loads, rapid
            // navigation, batch refreshes after downtime).
            //
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
            //
            // Clinical justification: A provider places ~2–4 orders per encounter
            // (labs, imaging, prescriptions, referrals) plus 1 assessment update.
            // With an average 10-minute encounter, that’s ~0.5 writes/min per
            // provider.  5 concurrent providers → ~2.5 writes/min steady-state.
            // The 60 limit allows massive headroom for bulk operations (chart
            // corrections, batch order entry) while preventing runaway automation.
            //
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
            //
            // Clinical justification: Normal login is a single request.  Even with
            // token refresh (every 5–15 min), a legitimate user never exceeds
            // 2–3 auth calls/min.  The 10 limit allows for retries and multi-tab
            // usage while stopping credential-stuffing attacks early.  Queue
            // limit = 0 to reject immediately (don’t queue auth attempts).
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
            //
            // Clinical justification: Kubernetes liveness/readiness probes
            // default to 10-second intervals (6 req/min).  Load balancers may
            // add another 6–12 req/min.  The 60 limit supports up to ~5
            // monitoring sources per IP with ample headroom.  Queue limit = 0
            // because health checks should fail-fast, not queue.
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
