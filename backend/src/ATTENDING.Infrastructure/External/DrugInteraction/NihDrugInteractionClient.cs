using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Infrastructure.External.DrugInteraction;

/// <summary>
/// Configuration for external drug interaction API.
/// Supports NIH RxNorm/Interaction API, First Databank, or Medi-Span.
/// </summary>
public class ExternalDrugInteractionOptions
{
    /// <summary>Base URL for the drug interaction API (e.g. "https://rxnav.nlm.nih.gov/REST")</summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>API key (optional — NIH APIs are free, commercial APIs require keys)</summary>
    public string? ApiKey { get; set; }

    /// <summary>Timeout in seconds for API calls</summary>
    public int TimeoutSeconds { get; set; } = 10;

    /// <summary>Source identifier for audit trail</summary>
    public string SourceName { get; set; } = "NIH-RxNorm";
}

/// <summary>
/// HTTP adapter for the NIH RxNorm Interaction API.
/// 
/// Uses the free NIH RxNorm REST API to check drug-drug interactions:
/// https://lhncbc.nlm.nih.gov/RxNav/APIs/InteractionAPIs.html
/// 
/// For production clinical use, consider upgrading to a commercial API
/// (First Databank, Medi-Span, Clinical Pharmacology) that provides
/// broader coverage and guaranteed SLAs.
/// 
/// Returns null on any failure — the caller (CompositeDrugInteractionService)
/// will fall back to the local hardcoded rules.
/// </summary>
public class NihDrugInteractionClient : IExternalDrugInteractionApi
{
    private readonly HttpClient _httpClient;
    private readonly ExternalDrugInteractionOptions _options;
    private readonly ILogger<NihDrugInteractionClient> _logger;

    public NihDrugInteractionClient(
        HttpClient httpClient,
        IOptions<ExternalDrugInteractionOptions> options,
        ILogger<NihDrugInteractionClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;

        // Do not set _httpClient.Timeout here — the resilience pipeline
        // (ResilienceConfiguration) already manages timeouts via OverallTimeout.
        // Setting HttpClient.Timeout would conflict with retry/circuit-breaker logic.
    }

    public async Task<ExternalDrugInteractionResult?> CheckInteractionsAsync(
        string newMedication,
        IEnumerable<string> currentMedications,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var allDrugs = currentMedications.Append(newMedication).ToList();
            if (allDrugs.Count < 2)
                return new ExternalDrugInteractionResult([], false, false, false, _options.SourceName);

            // Step 1: Resolve RxCUI identifiers for each drug name
            var rxCuis = new List<string>();
            foreach (var drugName in allDrugs)
            {
                var rxCui = await ResolveRxCuiAsync(drugName, cancellationToken);
                if (rxCui != null)
                    rxCuis.Add(rxCui);
            }

            if (rxCuis.Count < 2)
            {
                _logger.LogDebug("Could not resolve enough RxCUIs for interaction check. Resolved {Count}/{Total}",
                    rxCuis.Count, allDrugs.Count);
                return null; // Fall back to local
            }

            // Step 2: Check interactions via the list endpoint
            var rxCuiList = string.Join("+", rxCuis);
            var url = $"{_options.BaseUrl}/interaction/list.json?rxcuis={rxCuiList}";

            var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("NIH Interaction API returned {StatusCode}", response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
            return ParseInteractionResponse(json, newMedication);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogWarning(ex, "External drug interaction API call failed. Falling back to local rules.");
            return null;
        }
    }

    public Task<ExternalDrugInteractionResult?> CheckAllergyConflictsAsync(
        string medication,
        IEnumerable<string> allergies,
        CancellationToken cancellationToken = default)
    {
        // NIH RxNorm API doesn't have a direct allergy cross-reactivity endpoint.
        // Return null to fall back to the local DrugInteractionService which has
        // a curated cross-reactivity map.
        return Task.FromResult<ExternalDrugInteractionResult?>(null);
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.BaseUrl))
            return false;

        try
        {
            var response = await _httpClient.GetAsync(
                $"{_options.BaseUrl}/rxcui.json?name=aspirin", cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    private async Task<string?> ResolveRxCuiAsync(string drugName, CancellationToken ct)
    {
        try
        {
            var url = $"{_options.BaseUrl}/rxcui.json?name={Uri.EscapeDataString(drugName)}&search=1";
            var response = await _httpClient.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
            if (json.TryGetProperty("idGroup", out var idGroup) &&
                idGroup.TryGetProperty("rxnormId", out var ids) &&
                ids.GetArrayLength() > 0)
            {
                return ids[0].GetString();
            }

            return null;
        }
        catch
        {
            return null;
        }
    }

    private ExternalDrugInteractionResult ParseInteractionResponse(JsonElement json, string primaryDrug)
    {
        var interactions = new List<ExternalInteraction>();

        if (json.TryGetProperty("fullInteractionTypeGroup", out var groups))
        {
            foreach (var group in groups.EnumerateArray())
            {
                if (!group.TryGetProperty("fullInteractionType", out var types))
                    continue;

                foreach (var interactionType in types.EnumerateArray())
                {
                    if (!interactionType.TryGetProperty("interactionPair", out var pairs))
                        continue;

                    foreach (var pair in pairs.EnumerateArray())
                    {
                        var severity = pair.TryGetProperty("severity", out var sev)
                            ? sev.GetString() ?? "Unknown"
                            : "Unknown";

                        var description = pair.TryGetProperty("description", out var desc)
                            ? desc.GetString() ?? ""
                            : "";

                        var drugNames = new List<string>();
                        if (interactionType.TryGetProperty("minConcept", out var concepts))
                        {
                            foreach (var concept in concepts.EnumerateArray())
                            {
                                if (concept.TryGetProperty("name", out var name))
                                    drugNames.Add(name.GetString() ?? "");
                            }
                        }

                        var drug1 = drugNames.Count > 0 ? drugNames[0] : primaryDrug;
                        var drug2 = drugNames.Count > 1 ? drugNames[1] : "Unknown";

                        interactions.Add(new ExternalInteraction(
                            Drug1: drug1,
                            Drug2: drug2,
                            Severity: NormalizeSeverity(severity),
                            Description: description,
                            InteractionType: "Drug-Drug Interaction",
                            SourceReference: $"RxNorm:{_options.SourceName}"));
                    }
                }
            }
        }

        return new ExternalDrugInteractionResult(
            interactions,
            interactions.Count > 0,
            interactions.Any(i => i.Severity == "Contraindicated"),
            interactions.Any(i => i.Severity == "Major"),
            _options.SourceName);
    }

    private static string NormalizeSeverity(string apiSeverity)
    {
        return apiSeverity.ToLowerInvariant() switch
        {
            "high" or "major" or "severe" => "Major",
            "moderate" or "medium" => "Moderate",
            "low" or "minor" => "Minor",
            "contraindicated" or "critical" => "Contraindicated",
            "n/a" or "unknown" or "" => "Moderate",
            _ => "Moderate"
        };
    }
}

/// <summary>
/// Stub implementation used when no external API is configured.
/// Always returns null, causing the composite service to use local rules only.
/// </summary>
public class NullExternalDrugInteractionClient : IExternalDrugInteractionApi
{
    public Task<ExternalDrugInteractionResult?> CheckInteractionsAsync(
        string newMedication, IEnumerable<string> currentMedications,
        CancellationToken cancellationToken = default) => Task.FromResult<ExternalDrugInteractionResult?>(null);

    public Task<ExternalDrugInteractionResult?> CheckAllergyConflictsAsync(
        string medication, IEnumerable<string> allergies,
        CancellationToken cancellationToken = default) => Task.FromResult<ExternalDrugInteractionResult?>(null);

    public Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
        => Task.FromResult(false);
}
