using System.Diagnostics;
using System.Security.Claims;
using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Orders.Api.Middleware;

/// <summary>
/// Global exception handling middleware
/// </summary>
public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionMiddleware(
        RequestDelegate next,
        ILogger<ExceptionMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            await HandleValidationExceptionAsync(context, ex);
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException ex)
        {
            await HandleConcurrencyExceptionAsync(context, ex);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Client disconnected — log at debug level, no error response needed
            _logger.LogDebug("Request cancelled by client: {Path}", context.Request.Path);
            context.Response.StatusCode = 499; // nginx-style client closed request
        }
        catch (KeyNotFoundException ex)
        {
            await HandleNotFoundExceptionAsync(context, ex);
        }
        catch (UnauthorizedAccessException ex)
        {
            await HandleUnauthorizedExceptionAsync(context, ex);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Cannot") || ex.Message.Contains("Can only"))
        {
            await HandleBusinessRuleViolationAsync(context, ex);
        }
        catch (ATTENDING.Infrastructure.External.CircuitBreakerOpenException ex)
        {
            await HandleServiceUnavailableAsync(context, ex);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleValidationExceptionAsync(HttpContext context, ValidationException ex)
    {
        _logger.LogWarning(ex, "Validation failed for request {Path}", context.Request.Path);

        var errors = ex.Errors
            .GroupBy(e => e.PropertyName)
            .ToDictionary(
                g => g.Key,
                g => g.Select(e => e.ErrorMessage).ToArray());

        var problemDetails = new ValidationProblemDetails(errors)
        {
            Title = "Validation Failed",
            Status = StatusCodes.Status400BadRequest,
            Detail = "One or more validation errors occurred.",
            Instance = context.Request.Path
        };

        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsJsonAsync(problemDetails);
    }

    private async Task HandleConcurrencyExceptionAsync(
        HttpContext context, Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException ex)
    {
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;

        _logger.LogWarning(ex,
            "Concurrency conflict on {Path}. TraceId: {TraceId}. " +
            "Another provider likely modified this record simultaneously.",
            context.Request.Path, traceId);

        var problemDetails = new ProblemDetails
        {
            Title = "Concurrency Conflict",
            Status = StatusCodes.Status409Conflict,
            Detail = "This record was modified by another user since you last loaded it. " +
                     "Please refresh and retry your changes.",
            Instance = context.Request.Path,
            Extensions = { ["traceId"] = traceId }
        };

        context.Response.StatusCode = StatusCodes.Status409Conflict;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(problemDetails);
    }

    private async Task HandleNotFoundExceptionAsync(HttpContext context, KeyNotFoundException ex)
    {
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;

        _logger.LogWarning("Resource not found: {Path}. TraceId: {TraceId}",
            context.Request.Path, traceId);

        var problemDetails = new ProblemDetails
        {
            Title = "Resource Not Found",
            Status = StatusCodes.Status404NotFound,
            Detail = ex.Message,
            Instance = context.Request.Path,
            Extensions = { ["traceId"] = traceId }
        };

        context.Response.StatusCode = StatusCodes.Status404NotFound;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(problemDetails);
    }

    private async Task HandleUnauthorizedExceptionAsync(HttpContext context, UnauthorizedAccessException ex)
    {
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;

        _logger.LogWarning("Unauthorized access attempt: {Path}. TraceId: {TraceId}",
            context.Request.Path, traceId);

        var problemDetails = new ProblemDetails
        {
            Title = "Access Denied",
            Status = StatusCodes.Status403Forbidden,
            Detail = "You do not have permission to perform this action.",
            Instance = context.Request.Path,
            Extensions = { ["traceId"] = traceId }
        };

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(problemDetails);
    }

    private async Task HandleBusinessRuleViolationAsync(HttpContext context, InvalidOperationException ex)
    {
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;

        _logger.LogWarning("Business rule violation on {Path}: {Message}. TraceId: {TraceId}",
            context.Request.Path, ex.Message, traceId);

        var problemDetails = new ProblemDetails
        {
            Title = "Business Rule Violation",
            Status = StatusCodes.Status422UnprocessableEntity,
            Detail = ex.Message,
            Instance = context.Request.Path,
            Extensions = { ["traceId"] = traceId }
        };

        context.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(problemDetails);
    }

    private async Task HandleServiceUnavailableAsync(
        HttpContext context, ATTENDING.Infrastructure.External.CircuitBreakerOpenException ex)
    {
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;

        _logger.LogWarning(ex,
            "External service unavailable (circuit breaker open) for {Path}. TraceId: {TraceId}",
            context.Request.Path, traceId);

        var problemDetails = new ProblemDetails
        {
            Title = "Service Temporarily Unavailable",
            Status = StatusCodes.Status503ServiceUnavailable,
            Detail = "An external service is temporarily unavailable. " +
                     "The system will retry automatically. Please try again in a few moments.",
            Instance = context.Request.Path,
            Extensions = { ["traceId"] = traceId }
        };

        context.Response.Headers["Retry-After"] = "30";
        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(problemDetails);
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;

        _logger.LogError(ex, "Unhandled exception for request {Path}. TraceId: {TraceId}",
            context.Request.Path, traceId);

        var problemDetails = new ProblemDetails
        {
            Title = "An error occurred",
            Status = StatusCodes.Status500InternalServerError,
            Instance = context.Request.Path,
            Extensions = { ["traceId"] = traceId }
        };

        // Include stack trace in development
        if (_environment.IsDevelopment())
        {
            problemDetails.Detail = ex.ToString();
        }
        else
        {
            problemDetails.Detail = "An unexpected error occurred. Please try again later.";
        }

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsJsonAsync(problemDetails);
    }
}

/// <summary>
/// Audit logging middleware for HIPAA compliance
/// </summary>
public class AuditMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditMiddleware> _logger;

    // Paths that should be audited
    private static readonly string[] AuditablePaths = new[]
    {
        "/api/v1/laborders",
        "/api/v1/imagingorders",
        "/api/v1/medications",
        "/api/v1/referrals",
        "/api/v1/assessments",
        "/api/v1/patients"
    };

    public AuditMiddleware(RequestDelegate next, ILogger<AuditMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IAuditService auditService)
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";
        
        // Check if this request should be audited
        if (!ShouldAudit(context.Request))
        {
            await _next(context);
            return;
        }

        var stopwatch = Stopwatch.StartNew();
        var originalBodyStream = context.Response.Body;

        try
        {
            using var memoryStream = new MemoryStream();
            context.Response.Body = memoryStream;

            await _next(context);

            stopwatch.Stop();

            // Log the request
            await LogRequestAsync(context, auditService, stopwatch.ElapsedMilliseconds);

            // Copy the response back
            memoryStream.Seek(0, SeekOrigin.Begin);
            await memoryStream.CopyToAsync(originalBodyStream);
        }
        finally
        {
            context.Response.Body = originalBodyStream;
        }
    }

    private static bool ShouldAudit(HttpRequest request)
    {
        var path = request.Path.Value?.ToLower() ?? "";
        
        // Always audit state-changing operations
        if (request.Method is "POST" or "PUT" or "PATCH" or "DELETE")
        {
            return AuditablePaths.Any(p => path.StartsWith(p));
        }

        // Audit GET requests to patient data
        if (request.Method == "GET" && path.Contains("/patient"))
        {
            return true;
        }

        return false;
    }

    private async Task LogRequestAsync(HttpContext context, IAuditService auditService, long elapsedMs)
    {
        var userId = GetUserId(context);
        var patientId = ExtractPatientId(context);

        var entry = new AuditEntry
        {
            UserId = userId ?? "anonymous",
            Action = $"{context.Request.Method} {context.Request.Path}",
            EntityType = ExtractEntityType(context.Request.Path.Value ?? ""),
            EntityId = ExtractEntityId(context.Request.Path.Value ?? ""),
            PatientId = patientId,
            IpAddress = GetClientIp(context),
            UserAgent = context.Request.Headers["User-Agent"].ToString(),
            Details = new Dictionary<string, object>
            {
                ["statusCode"] = context.Response.StatusCode,
                ["elapsedMs"] = elapsedMs
            }
        };

        try
        {
            await auditService.LogAsync(entry);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write audit log");
        }
    }

    private static string? GetUserId(HttpContext context)
    {
        return context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
               context.User.FindFirst("sub")?.Value ??
               context.User.FindFirst("oid")?.Value;
    }

    private static string? ExtractPatientId(HttpContext context)
    {
        // Try to get patient ID from route
        if (context.Request.RouteValues.TryGetValue("patientId", out var patientId))
        {
            return patientId?.ToString();
        }

        // Try to get from query string
        if (context.Request.Query.TryGetValue("patientId", out var queryPatientId))
        {
            return queryPatientId.FirstOrDefault();
        }

        return null;
    }

    private static string ExtractEntityType(string path)
    {
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length >= 3)
        {
            return segments[2]; // e.g., "laborders" from "/api/v1/laborders/..."
        }
        return "unknown";
    }

    private static string ExtractEntityId(string path)
    {
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length >= 4 && Guid.TryParse(segments[3], out _))
        {
            return segments[3];
        }
        return string.Empty;
    }

    private static string GetClientIp(HttpContext context)
    {
        // Check X-Forwarded-For header first (for load balancers/proxies)
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}


/// <summary>
/// Adds a correlation ID to every request for distributed tracing
/// </summary>
public class CorrelationIdMiddleware
{
    private const string CorrelationIdHeader = "X-Correlation-Id";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Headers.TryGetValue(CorrelationIdHeader, out var correlationId) 
            || string.IsNullOrWhiteSpace(correlationId))
        {
            correlationId = Guid.NewGuid().ToString("N");
        }

        context.Items["CorrelationId"] = correlationId.ToString();
        context.Response.Headers[CorrelationIdHeader] = correlationId.ToString();

        using (Serilog.Context.LogContext.PushProperty("CorrelationId", correlationId.ToString()))
        {
            await _next(context);
        }
    }
}

/// <summary>
/// Adds API version and deprecation/sunset headers to all responses.
///
/// Per RFC 8594: the Sunset header indicates a deprecation date for an endpoint.
/// When a route is routed to a deprecated version (e.g. /api/v0/ patterns),
/// the Deprecation and Sunset headers are added automatically.
///
/// Consumers monitoring these headers can plan migrations before sunset dates.
/// </summary>
public class ApiVersionHeaderMiddleware
{
    // Map of route prefix → (deprecated since, sunset date)
    // Add entries here when you deprecate an API version.
    private static readonly Dictionary<string, (string Deprecated, string Sunset)> DeprecatedVersions =
        new(StringComparer.OrdinalIgnoreCase)
        {
            // Example: { "/api/v0/", ("Tue, 01 Jul 2025 00:00:00 GMT", "Sat, 01 Jan 2026 00:00:00 GMT") }
        };

    private readonly RequestDelegate _next;

    public ApiVersionHeaderMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers["X-Api-Version"] = "1.0";
        // NOTE: X-Powered-By is intentionally omitted. Advertising the platform name
        // is an information disclosure that helps attackers fingerprint the system.
        // Kestrel's AddServerHeader=false already suppresses the Server header;
        // X-Powered-By would undo that work.

        // Add RFC 8594 Sunset/Deprecation headers for deprecated routes
        var path = context.Request.Path.Value ?? "";
        foreach (var (prefix, dates) in DeprecatedVersions)
        {
            if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                context.Response.Headers["Deprecation"] = dates.Deprecated;
                context.Response.Headers["Sunset"] = dates.Sunset;
                context.Response.Headers["Link"] = "</api/v1/>; rel=\"successor-version\"";
                break;
            }
        }

        await _next(context);
    }
}


/// <summary>
/// Adds security headers to all responses (OWASP recommended)
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["X-Frame-Options"] = "DENY";
        context.Response.Headers["X-XSS-Protection"] = "0"; // Modern approach: rely on CSP instead
        context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'";
        context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
        
        await _next(context);
    }
}
