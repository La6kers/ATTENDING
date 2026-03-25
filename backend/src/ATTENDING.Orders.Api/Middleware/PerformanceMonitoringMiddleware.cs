using System.Diagnostics;

namespace ATTENDING.Orders.Api.Middleware;

/// <summary>
/// Measures end-to-end response time for every request and:
///
///   1. Adds an X-Response-Time-Ms header to the response (visible to clients and APM tools)
///   2. Logs a structured warning when the response time exceeds the configured SLA for that route
///   3. Logs a structured error when the response time exceeds 2× the SLA (critical breach)
///
/// SLA thresholds are configured in appsettings.json under "PerformanceSla:Routes".
/// A default threshold applies to any route not explicitly listed.
///
/// Placement: register this middleware early in the pipeline — before authentication —
/// so the measurement includes the full request lifecycle. It must be AFTER
/// SecurityHeadersMiddleware (which runs first) but BEFORE the app middleware chain.
/// </summary>
public class PerformanceMonitoringMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<PerformanceMonitoringMiddleware> _logger;
    private readonly SlaConfiguration _sla;

    public PerformanceMonitoringMiddleware(
        RequestDelegate next,
        ILogger<PerformanceMonitoringMiddleware> logger,
        SlaConfiguration sla)
    {
        _next = next;
        _logger = logger;
        _sla = sla;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();

        // Register header callback BEFORE the response starts.
        // OnStarting fires just before headers are sent to the client,
        // so the stopwatch captures middleware + handler time up to that point.
        context.Response.OnStarting(() =>
        {
            var elapsedMs = sw.ElapsedMilliseconds;
            context.Response.Headers["X-Response-Time-Ms"] = elapsedMs.ToString();
            return Task.CompletedTask;
        });

        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();
            EvaluateSla(context, sw.ElapsedMilliseconds);
        }
    }

    private void EvaluateSla(HttpContext context, long elapsedMs)
    {
        // Only evaluate SLA for API routes (skip health checks and static content)
        var path = context.Request.Path.Value ?? "";
        if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
            return;

        var method = context.Request.Method;
        var statusCode = context.Response.StatusCode;
        var slaMs = _sla.GetThreshold(method, path);

        if (elapsedMs <= slaMs)
            return;  // Within SLA — nothing to report

        // Build base log properties (no PHI — path only, method, status)
        var correlationId = context.Items.TryGetValue("CorrelationId", out var cid) ? cid?.ToString() : null;

        if (elapsedMs >= slaMs * 2)
        {
            // Critical breach: > 2× SLA
            _logger.LogError(
                "SLA_CRITICAL_BREACH: {Method} {Path} took {ElapsedMs}ms " +
                "(SLA={SlaMs}ms). Status={StatusCode} CorrelationId={CorrelationId}",
                method, path, elapsedMs, slaMs, statusCode, correlationId);
        }
        else
        {
            // Warning: SLA exceeded but < 2× SLA
            _logger.LogWarning(
                "SLA_BREACH: {Method} {Path} took {ElapsedMs}ms " +
                "(SLA={SlaMs}ms). Status={StatusCode} CorrelationId={CorrelationId}",
                method, path, elapsedMs, slaMs, statusCode, correlationId);
        }
    }
}

/// <summary>
/// Clinical SLA thresholds for ATTENDING API routes.
///
/// Thresholds are defined per HTTP method + route prefix pattern, with a fallback default.
/// The most specific matching prefix wins (longer prefix = higher priority).
///
/// Clinical rationale for thresholds:
///   - Read paths (GET)         : 200–250ms — clinicians expect near-instant retrieval
///   - Write paths (POST/PATCH) : 400–600ms — acceptable for order creation workflows
///   - Assessment writes        : 800ms     — includes AI triage evaluation latency
///   - Critical results query   : 150ms     — patient safety; must be fastest read path
///   - Health checks            : 100ms     — for load balancer liveness probes
/// </summary>
public class SlaConfiguration
{
    // Ordered list of (method, prefix, thresholdMs)
    // Checked longest-prefix-first; first match wins.
    private readonly List<SlaRule> _rules;
    private readonly long _defaultMs;

    public SlaConfiguration(List<SlaRule> rules, long defaultMs = 1000)
    {
        // Sort by prefix length descending so longer (more specific) prefixes match first
        _rules = rules.OrderByDescending(r => r.PathPrefix.Length).ToList();
        _defaultMs = defaultMs;
    }

    public long GetThreshold(string method, string path)
    {
        foreach (var rule in _rules)
        {
            // Method "*" means "any method"
            var methodMatches = rule.Method == "*" ||
                                rule.Method.Equals(method, StringComparison.OrdinalIgnoreCase);

            if (methodMatches && path.StartsWith(rule.PathPrefix, StringComparison.OrdinalIgnoreCase))
                return rule.ThresholdMs;
        }

        return _defaultMs;
    }

    /// <summary>Returns all rules, used for diagnostic endpoints and tests.</summary>
    public IReadOnlyList<SlaRule> Rules => _rules.AsReadOnly();
    public long DefaultMs => _defaultMs;
}

/// <summary>A single SLA rule mapping (method + route prefix) to a response-time threshold.</summary>
public record SlaRule(string Method, string PathPrefix, long ThresholdMs);

/// <summary>
/// Extension method to register SlaConfiguration from appsettings and add the middleware.
/// </summary>
public static class PerformanceMonitoringExtensions
{
    public static IServiceCollection AddPerformanceMonitoring(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var section = configuration.GetSection("PerformanceSla");
        var defaultMs = section.GetValue<long>("DefaultMs", 1000);

        var routeSection = section.GetSection("Routes");
        var rules = new List<SlaRule>();

        foreach (var child in routeSection.GetChildren())
        {
            var method = child["Method"] ?? "*";
            var prefix = child["PathPrefix"] ?? "";
            var ms = child.GetValue<long>("ThresholdMs", defaultMs);

            if (!string.IsNullOrWhiteSpace(prefix))
                rules.Add(new SlaRule(method, prefix, ms));
        }

        services.AddSingleton(new SlaConfiguration(rules, defaultMs));
        return services;
    }
}
