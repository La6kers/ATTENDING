using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Distributed;

namespace ATTENDING.Orders.Api.Middleware;

/// <summary>
/// Idempotency middleware for state-changing clinical operations.
///
/// Healthcare context: A network timeout during lab order creation could cause
/// the client to retry, creating a duplicate order — a patient safety risk.
/// This middleware ensures that retried requests with the same idempotency key
/// return the original response without re-executing the operation.
///
/// Usage: Client sends "Idempotency-Key: {uuid}" header on POST/PUT/PATCH requests.
/// The middleware caches the response for the configured TTL. Subsequent requests
/// with the same key receive the cached response (HTTP 200 with original body).
///
/// If no key is provided on mutation endpoints, the request proceeds normally
/// (backwards compatible) but a warning header is added.
///
/// Keys are scoped per-tenant to prevent cross-tenant cache collisions.
/// </summary>
public class IdempotencyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<IdempotencyMiddleware> _logger;

    private const string IdempotencyKeyHeader = "Idempotency-Key";
    private const string IdempotencyReplayedHeader = "Idempotency-Replayed";
    private const string CachePrefix = "idempotency:";

    /// <summary>
    /// How long to cache idempotent responses. 24 hours covers retry windows
    /// while not accumulating stale entries indefinitely.
    /// </summary>
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);

    /// <summary>
    /// Maximum key length to prevent abuse via oversized headers.
    /// </summary>
    private const int MaxKeyLength = 128;

    /// <summary>
    /// Paths that require idempotency protection (order creation endpoints).
    /// </summary>
    private static readonly string[] ProtectedPaths =
    {
        "/api/v1/laborders",
        "/api/v1/imagingorders",
        "/api/v1/medications",
        "/api/v1/referrals",
        "/api/v1/assessments",
    };

    public IdempotencyMiddleware(RequestDelegate next, ILogger<IdempotencyMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IDistributedCache cache)
    {
        // Only apply to state-changing methods
        if (context.Request.Method is not ("POST" or "PUT" or "PATCH"))
        {
            await _next(context);
            return;
        }

        var path = context.Request.Path.Value?.ToLower() ?? "";

        // Only apply to protected clinical paths
        if (!ProtectedPaths.Any(p => path.StartsWith(p)))
        {
            await _next(context);
            return;
        }

        // Check for idempotency key
        if (!context.Request.Headers.TryGetValue(IdempotencyKeyHeader, out var keyValue)
            || string.IsNullOrWhiteSpace(keyValue))
        {
            // No key provided — proceed without idempotency but warn
            context.Response.Headers["X-Idempotency-Warning"] =
                "No Idempotency-Key header provided. Retries may create duplicate resources.";
            await _next(context);
            return;
        }

        var rawKey = keyValue.ToString().Trim();

        // Validate key format
        if (rawKey.Length > MaxKeyLength)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsJsonAsync(new
            {
                title = "Invalid Idempotency Key",
                status = 400,
                detail = $"Idempotency-Key must not exceed {MaxKeyLength} characters."
            });
            return;
        }

        // Scope key per-tenant to prevent cross-tenant collisions.
        // Idempotency only applies to authenticated requests where we have a reliable
        // user identity. Anonymous requests using IP are vulnerable to spoofing, so
        // we skip idempotency checking entirely for unauthenticated callers.
        var tenantId = context.User.FindFirst("oid")?.Value
                    ?? context.User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(tenantId))
        {
            _logger.LogDebug(
                "Skipping idempotency for unauthenticated request on {Path}. " +
                "Idempotency requires a reliable user identity.", path);
            await _next(context);
            return;
        }

        var cacheKey = $"{CachePrefix}{tenantId}:{HashKey(rawKey)}";

        // Check cache for existing response
        try
        {
            var cached = await cache.GetStringAsync(cacheKey, context.RequestAborted);
            if (cached != null)
            {
                _logger.LogInformation(
                    "Idempotency replay for key {Key} on {Path} (tenant: {Tenant})",
                    rawKey, path, tenantId);

                var cachedResponse = System.Text.Json.JsonSerializer.Deserialize<CachedResponse>(cached);
                if (cachedResponse != null)
                {
                    context.Response.StatusCode = cachedResponse.StatusCode;
                    context.Response.ContentType = cachedResponse.ContentType ?? "application/json";
                    context.Response.Headers[IdempotencyReplayedHeader] = "true";

                    if (!string.IsNullOrEmpty(cachedResponse.Body))
                    {
                        await context.Response.WriteAsync(cachedResponse.Body, context.RequestAborted);
                    }
                    return;
                }
            }
        }
        catch (Exception ex)
        {
            // Cache failure should not block the request — log and proceed
            _logger.LogWarning(ex, "Idempotency cache read failed for key {Key}. Proceeding without replay.", rawKey);
        }

        // Capture the response so we can cache it
        var originalBody = context.Response.Body;
        using var memoryStream = new MemoryStream();
        context.Response.Body = memoryStream;

        try
        {
            await _next(context);

            // Cache successful responses (2xx) and deterministic client errors (409, 422)
            if ((context.Response.StatusCode >= 200 && context.Response.StatusCode < 300) ||
                context.Response.StatusCode == 409 ||
                context.Response.StatusCode == 422)
            {
                memoryStream.Seek(0, SeekOrigin.Begin);
                var responseBody = await new StreamReader(memoryStream).ReadToEndAsync(context.RequestAborted);

                var responseToCache = new CachedResponse
                {
                    StatusCode = context.Response.StatusCode,
                    ContentType = context.Response.ContentType,
                    Body = responseBody
                };

                try
                {
                    var serialized = System.Text.Json.JsonSerializer.Serialize(responseToCache);
                    await cache.SetStringAsync(cacheKey, serialized,
                        new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = CacheTtl },
                        context.RequestAborted);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to cache idempotent response for key {Key}", rawKey);
                }
            }

            // Write the response back to the original stream
            memoryStream.Seek(0, SeekOrigin.Begin);
            await memoryStream.CopyToAsync(originalBody, context.RequestAborted);
        }
        finally
        {
            context.Response.Body = originalBody;
        }
    }

    /// <summary>
    /// Hash the raw key to a fixed-length cache key (prevents oversized Redis keys).
    /// </summary>
    private static string HashKey(string rawKey)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawKey));
        return Convert.ToHexString(bytes)[..32].ToLower();
    }

    private sealed class CachedResponse
    {
        public int StatusCode { get; set; }
        public string? ContentType { get; set; }
        public string? Body { get; set; }
    }
}
