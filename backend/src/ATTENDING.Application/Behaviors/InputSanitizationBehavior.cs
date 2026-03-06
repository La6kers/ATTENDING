using System.Reflection;
using System.Text.RegularExpressions;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ATTENDING.Application.Behaviors;

/// <summary>
/// MediatR pipeline behavior that sanitizes string properties on command objects
/// before they reach handlers.
///
/// Healthcare context: Clinical text legitimately contains angle brackets
/// ("O2 &lt; 90%", "temp &gt; 101°F"), ampersands, and other characters that
/// look like HTML but aren't. This sanitizer specifically targets dangerous
/// HTML constructs (script tags, event handlers, javascript: URIs) rather than
/// broadly encoding all special characters, which would corrupt clinical data.
///
/// Runs BEFORE ValidationBehavior so validators see sanitized input.
///
/// What it strips:
///   - script blocks (including content)
///   - iframe, object, embed, link, meta tags
///   - form, input, button, select, textarea tags
///   - Event handler attributes (onclick, onload, onerror, etc.)
///   - javascript:, vbscript:, data: URI schemes in attributes
///   - style blocks with expressions
///
/// What it preserves:
///   - Plain text with angle brackets ("BP &lt; 120/80")
///   - Clinical abbreviations ("C/S", "D&amp;C", "L&amp;D")
///   - Standard punctuation and Unicode
///   - Null and empty strings (passed through unchanged)
/// </summary>
public partial class InputSanitizationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<InputSanitizationBehavior<TRequest, TResponse>> _logger;

    public InputSanitizationBehavior(ILogger<InputSanitizationBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        // Only sanitize command objects (writes), not queries (reads)
        var requestTypeName = typeof(TRequest).Name;
        if (!requestTypeName.EndsWith("Command", StringComparison.OrdinalIgnoreCase))
        {
            return await next();
        }

        var sanitizedCount = SanitizeObject(request);

        if (sanitizedCount > 0)
        {
            _logger.LogInformation(
                "Sanitized {Count} string properties on {RequestType}",
                sanitizedCount, requestTypeName);
        }

        return await next();
    }

    /// <summary>
    /// Reflects over public string properties and sanitizes in-place.
    /// Returns the count of properties that were modified.
    /// </summary>
    private int SanitizeObject(object obj)
    {
        var count = 0;
        var skipped = 0;
        var type = obj.GetType();

        // For record types, we can't set properties (they're init-only).
        // Instead, we sanitize the backing fields directly.
        // C# records with positional parameters have backing fields named <ParamName>k__BackingField.
        foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (prop.PropertyType != typeof(string))
                continue;

            var original = (string?)prop.GetValue(obj);
            if (string.IsNullOrEmpty(original))
                continue;

            var sanitized = SanitizeString(original);
            if (!ReferenceEquals(original, sanitized) && original != sanitized)
            {
                // Try to set via property setter first
                if (prop.CanWrite)
                {
                    prop.SetValue(obj, sanitized);
                    count++;
                }
                else
                {
                    // For record types with init-only setters, access the backing field
                    var backingField = type.GetField(
                        $"<{prop.Name}>k__BackingField",
                        BindingFlags.Instance | BindingFlags.NonPublic);

                    if (backingField != null)
                    {
                        backingField.SetValue(obj, sanitized);
                        count++;
                    }
                    else
                    {
                        // Backing field not found — sanitization skipped for this property.
                        // This can happen with non-standard record types or custom property
                        // implementations where the compiler uses a different naming convention.
                        _logger.LogWarning(
                            "Could not sanitize init-only property {PropertyName} on {TypeName}: " +
                            "backing field <{PropertyName}>k__BackingField not found. " +
                            "The property contains potentially dangerous content that was not sanitized.",
                            prop.Name, type.Name, prop.Name);
                        skipped++;
                    }
                }
            }
        }

        if (skipped > 0)
        {
            _logger.LogWarning(
                "Sanitization skipped {SkippedCount} init-only properties on {TypeName} — " +
                "these properties could not be sanitized via backing field reflection.",
                skipped, type.Name);
        }

        return count;
    }

    /// <summary>
    /// Sanitize a single string value by removing dangerous HTML constructs.
    /// </summary>
    internal static string SanitizeString(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        var result = input;

        // 1. Remove <script>...</script> blocks (including content)
        result = ScriptBlockRegex().Replace(result, string.Empty);

        // 2. Remove <style>...</style> blocks with expression() — CSS injection
        result = StyleBlockRegex().Replace(result, string.Empty);

        // 3. Remove dangerous tags (self-closing or opening)
        //    iframe, object, embed, link, meta, form, input, button, select, textarea, applet, base
        result = DangerousTagRegex().Replace(result, string.Empty);

        // 4. Remove event handler attributes from any remaining tags
        //    Matches on*, e.g. onclick="...", onerror='...', onload=alert(1)
        result = EventHandlerRegex().Replace(result, string.Empty);

        // 5. Remove javascript:, vbscript:, and data: URI schemes
        result = DangerousUriRegex().Replace(result, string.Empty);

        // 6. Trim any extra whitespace that sanitization may have left
        result = MultipleSpacesRegex().Replace(result, " ").Trim();

        return result;
    }

    // ----------------------------------------------------------------
    // Compiled regex patterns (source-generated for performance)
    // ----------------------------------------------------------------

    [GeneratedRegex(@"<script\b[^>]*>[\s\S]*?</script\s*>", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex ScriptBlockRegex();

    [GeneratedRegex(@"<style\b[^>]*>[\s\S]*?</style\s*>", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex StyleBlockRegex();

    [GeneratedRegex(
        @"</?(?:iframe|object|embed|link|meta|form|input|button|select|textarea|applet|base|svg|math)\b[^>]*>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex DangerousTagRegex();

    [GeneratedRegex(
        @"\s+on\w+\s*=\s*(?:""[^""]*""|'[^']*'|[^\s>]+)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex EventHandlerRegex();

    [GeneratedRegex(
        @"(?:javascript|vbscript|data)\s*:",
        RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex DangerousUriRegex();

    [GeneratedRegex(@"\s{2,}")]
    private static partial Regex MultipleSpacesRegex();
}
