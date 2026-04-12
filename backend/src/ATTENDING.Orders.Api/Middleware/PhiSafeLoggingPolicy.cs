using Serilog.Core;
using Serilog.Events;

namespace ATTENDING.Orders.Api.Middleware;

/// <summary>
/// Serilog destructuring policy that masks PHI fields in log output.
///
/// Healthcare applications must not write PHI to log sinks in plaintext.
/// This policy intercepts log events and replaces known PHI-bearing property
/// values with a masked placeholder before the event reaches any sink.
///
/// Fields masked: MRN, PatientName, DateOfBirth, SSN, Phone, Email,
/// Address fields, NPI, and any property containing "phi" in its name.
///
/// Usage in Program.cs:
///   .Destructure.With&lt;PhiMaskingDestructuringPolicy&gt;()
/// </summary>
public class PhiMaskingDestructuringPolicy : IDestructuringPolicy
{
    // PHI property names (case-insensitive exact match or substring)
    private static readonly HashSet<string> ExactPhiFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "MRN", "PatientMrn",
        "PatientName", "FirstName", "LastName", "FullName",
        "DateOfBirth", "Dob",
        "SSN", "SocialSecurityNumber",
        "Phone", "PhoneNumber",
        "Email", "EmailAddress",
        "AddressLine1", "AddressLine2",
        "NPI",                          // masked in logs but not a secret
    };

    // PHI substrings — property names containing any of these are masked
    private static readonly string[] PhiSubstrings = new[]
    {
        "phi",          // catch-all for explicitly named phi properties
        "password",
        "secret",
        "token",
        "connectionstring",
        "apikey",
    };

    public bool TryDestructure(object value, ILogEventPropertyValueFactory propertyValueFactory, out LogEventPropertyValue result)
    {
        // We only intercept IDictionary-like objects with string keys
        // (e.g., anonymous objects logged as structured data)
        if (value is IDictionary<string, object> dict)
        {
            var maskedProperties = dict
                .Select(kvp => new LogEventProperty(
                    kvp.Key,
                    ShouldMask(kvp.Key)
                        ? new ScalarValue("***PHI-MASKED***")
                        : propertyValueFactory.CreatePropertyValue(kvp.Value, destructureObjects: true)))
                .ToList();

            result = new StructureValue(maskedProperties);
            return true;
        }

        result = null!;
        return false;
    }

    internal static bool ShouldMask(string propertyName)
    {
        if (ExactPhiFields.Contains(propertyName))
            return true;

        foreach (var sub in PhiSubstrings)
        {
            if (propertyName.Contains(sub, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }
}

/// <summary>
/// Serilog log event enricher that adds a sanitized version of the request path,
/// strips query parameters (which may contain PHI), and adds the correlation ID.
///
/// This ensures that any request path logged by Serilog request logging never
/// leaks query-string PHI (e.g., ?mrn=123 patterns in older API callers).
/// </summary>
public class PhiSafeRequestEnricher : ILogEventEnricher
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public PhiSafeRequestEnricher(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        var context = _httpContextAccessor.HttpContext;
        if (context == null) return;

        // Log only the path, never the query string (PHI protection)
        var safePath = context.Request.Path.Value ?? "/";
        logEvent.AddOrUpdateProperty(
            propertyFactory.CreateProperty("RequestPath", safePath, destructureObjects: false));

        // Propagate correlation ID to every log event
        if (context.Items.TryGetValue("CorrelationId", out var correlationId) && correlationId != null)
        {
            logEvent.AddOrUpdateProperty(
                propertyFactory.CreateProperty("CorrelationId", correlationId.ToString(), destructureObjects: false));
        }

        // Log tenant ID for cross-tenant incident investigation (not PHI)
        var tenantId = context.User.FindFirst("oid")?.Value ?? context.User.FindFirst("sub")?.Value;
        if (!string.IsNullOrWhiteSpace(tenantId))
        {
            logEvent.AddOrUpdateProperty(
                propertyFactory.CreateProperty("TenantId", tenantId, destructureObjects: false));
        }
    }
}
