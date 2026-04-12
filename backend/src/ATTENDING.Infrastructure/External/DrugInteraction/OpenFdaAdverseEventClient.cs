using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Infrastructure.External.DrugInteraction;

/// <summary>
/// Configuration for OpenFDA Adverse Events API.
/// Free, no API key required (optional key increases rate limit from 40/min to 240/min).
/// </summary>
public class OpenFdaOptions
{
    /// <summary>Base URL for the OpenFDA drug endpoint</summary>
    public string BaseUrl { get; set; } = "https://api.fda.gov/drug";

    /// <summary>Optional API key (increases rate limit from 40/min to 240/min)</summary>
    public string? ApiKey { get; set; }

    /// <summary>Timeout in seconds for API calls</summary>
    public int TimeoutSeconds { get; set; } = 10;

    /// <summary>Minimum number of adverse event reports to consider significant</summary>
    public int MinReportThreshold { get; set; } = 50;
}

/// <summary>
/// HTTP adapter for the OpenFDA Drug Adverse Events API.
/// 
/// Uses the free OpenFDA API to find adverse event signals when two drugs
/// are co-reported. This is complementary to RxNorm interaction data:
/// - RxNorm: Pharmacokinetic/pharmacodynamic interactions (known science)
/// - OpenFDA: Post-market adverse event reports (real-world signal detection)
///
/// API docs: https://open.fda.gov/apis/drug/event/
/// 
/// Returns null on any failure — callers fall back gracefully.
/// </summary>
public class OpenFdaAdverseEventClient : IExternalDrugInteractionApi
{
    private readonly HttpClient _httpClient;
    private readonly OpenFdaOptions _options;
    private readonly ILogger<OpenFdaAdverseEventClient> _logger;

    public OpenFdaAdverseEventClient(
        HttpClient httpClient,
        OpenFdaOptions options,
        ILogger<OpenFdaAdverseEventClient> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _logger = logger;

        _httpClient.Timeout = TimeSpan.FromSeconds(_options.TimeoutSeconds);
    }

    public async Task<ExternalDrugInteractionResult?> CheckInteractionsAsync(
        string newMedication,
        IEnumerable<string> currentMedications,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var currentMedList = currentMedications.ToList();
            if (currentMedList.Count == 0)
                return new ExternalDrugInteractionResult([], false, false, false, "OpenFDA");

            var interactions = new List<ExternalInteraction>();

            // Check adverse event co-reports for new med + each current med
            foreach (var currentMed in currentMedList)
            {
                var result = await CheckPairAdverseEventsAsync(
                    newMedication, currentMed, cancellationToken);

                if (result != null)
                    interactions.Add(result);
            }

            return new ExternalDrugInteractionResult(
                interactions,
                interactions.Count > 0,
                interactions.Any(i => i.Severity == "Contraindicated"),
                interactions.Any(i => i.Severity == "Major"),
                "OpenFDA-AdverseEvents");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogWarning(ex, "OpenFDA adverse event API call failed.");
            return null;
        }
    }

    public Task<ExternalDrugInteractionResult?> CheckAllergyConflictsAsync(
        string medication,
        IEnumerable<string> allergies,
        CancellationToken cancellationToken = default)
    {
        // OpenFDA adverse events API doesn't cover allergy cross-reactivity
        return Task.FromResult<ExternalDrugInteractionResult?>(null);
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var url = BuildUrl("/event.json?search=patient.drug.openfda.generic_name:\"aspirin\"&limit=1");
            var response = await _httpClient.GetAsync(url, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Search OpenFDA for adverse event reports where both drugs are co-reported.
    /// A high co-report count with serious outcomes signals a potential interaction.
    /// </summary>
    private async Task<ExternalInteraction?> CheckPairAdverseEventsAsync(
        string drug1, string drug2, CancellationToken ct)
    {
        // Search for adverse events where both drugs are listed
        var escapedDrug1 = Uri.EscapeDataString(drug1.ToLowerInvariant());
        var escapedDrug2 = Uri.EscapeDataString(drug2.ToLowerInvariant());

        var search = $"patient.drug.openfda.generic_name:\"{escapedDrug1}\"+AND+" +
                     $"patient.drug.openfda.generic_name:\"{escapedDrug2}\"";
        var url = BuildUrl($"/event.json?search={search}&limit=1");

        var response = await _httpClient.GetAsync(url, ct);

        if (!response.IsSuccessStatusCode)
        {
            // 404 = no results found — not an error, just no co-reports
            if ((int)response.StatusCode == 404)
                return null;

            _logger.LogDebug("OpenFDA returned {StatusCode} for {Drug1}+{Drug2}",
                response.StatusCode, drug1, drug2);
            return null;
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
        return ParseAdverseEventResponse(json, drug1, drug2);
    }

    private ExternalInteraction? ParseAdverseEventResponse(
        JsonElement json, string drug1, string drug2)
    {
        // Extract total count of co-reports
        if (!json.TryGetProperty("meta", out var meta) ||
            !meta.TryGetProperty("results", out var results) ||
            !results.TryGetProperty("total", out var totalElement))
            return null;

        var totalReports = totalElement.GetInt32();

        if (totalReports < _options.MinReportThreshold)
            return null; // Below signal threshold

        // Check for serious outcomes in the results
        var hasSeriousOutcome = false;
        var seriousReactions = new List<string>();

        if (json.TryGetProperty("results", out var resultArray))
        {
            foreach (var result in resultArray.EnumerateArray())
            {
                // Check seriousness flags
                if (result.TryGetProperty("serious", out var serious) &&
                    serious.GetInt32() == 1)
                {
                    hasSeriousOutcome = true;
                }

                // Collect reaction terms
                if (result.TryGetProperty("patient", out var patient) &&
                    patient.TryGetProperty("reaction", out var reactions))
                {
                    foreach (var reaction in reactions.EnumerateArray())
                    {
                        if (reaction.TryGetProperty("reactionmeddrapt", out var term))
                        {
                            var reactionTerm = term.GetString();
                            if (!string.IsNullOrWhiteSpace(reactionTerm))
                                seriousReactions.Add(reactionTerm);
                        }
                    }
                }
            }
        }

        // Classify severity based on report volume and outcome seriousness
        var severity = ClassifySeverity(totalReports, hasSeriousOutcome);

        var topReactions = seriousReactions
            .GroupBy(r => r, StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(g => g.Count())
            .Take(3)
            .Select(g => g.Key)
            .ToList();

        var reactionSummary = topReactions.Count > 0
            ? $"Most reported: {string.Join(", ", topReactions)}"
            : "See FDA adverse event reports";

        return new ExternalInteraction(
            Drug1: drug1,
            Drug2: drug2,
            Severity: severity,
            Description: $"FDA adverse event signal: {totalReports:N0} co-reports found. " +
                         $"{(hasSeriousOutcome ? "Includes serious outcomes. " : "")}" +
                         reactionSummary,
            InteractionType: "Adverse Event Signal",
            SourceReference: $"OpenFDA:event:{drug1}+{drug2}");
    }

    /// <summary>
    /// Classify interaction severity based on adverse event report volume and seriousness.
    /// These thresholds are conservative — better to over-warn than under-warn.
    /// </summary>
    private static string ClassifySeverity(int reportCount, bool hasSeriousOutcome)
    {
        return (reportCount, hasSeriousOutcome) switch
        {
            ( >= 1000, true) => "Major",
            ( >= 500, true) => "Major",
            ( >= 500, false) => "Moderate",
            ( >= 100, true) => "Moderate",
            _ => "Minor"
        };
    }

    private string BuildUrl(string path)
    {
        var url = $"{_options.BaseUrl}{path}";
        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
            url += $"&api_key={_options.ApiKey}";
        return url;
    }
}
