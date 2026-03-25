using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ATTENDING.Infrastructure.External.FHIR;

/// <summary>
/// athenahealth FHIR R4 client.
///
/// Strategic note for ATTENDING: athenahealth is the dominant EHR in independent
/// rural practices — exactly the RHTP target market. Epic/Cerner dominate hospital
/// systems; athena dominates small-group and solo rural practices.
///
/// Key athena differences from Epic/Cerner:
///   1. OAuth token URL is GLOBAL — not tenant-specific (unlike Cerner).
///      Token endpoint: https://api.platform.athenahealth.com/oauth2/v1/token
///   2. Patient identifier type uses type.coding.code == "MR" (HL7 v2 table),
///      not a vendor-specific system URL.
///   3. No-known-allergy is a SNOMED sentinel code (716186003) in the allergy
///      resource — filter it out before display so providers don't see "NKA" as
///      an allergy entry.
///   4. MedicationRequest.status uses "stopped" for discontinued (not "cancelled").
///   5. Vitals may return individual Observation resources instead of a panel bundle.
///   6. Rate limit: 250 req/min per practice (429 responses expected under load).
///
/// The HttpClient is pre-configured (base URL, Accept header) by DependencyInjection.cs.
/// Sandbox: https://api.sandbox.platform.athenahealth.com/fhir/r4
/// Dev portal: https://developer.athenahealth.com/
/// </summary>
public class AthenaFhirClient : IFhirClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AthenaFhirClient> _logger;
    private readonly FhirClientOptions _options;

    // athena NKA sentinel — filter from allergy lists before surfacing to providers
    private const string NkaSnomed = "716186003";

    public AthenaFhirClient(
        HttpClient httpClient,
        ILogger<AthenaFhirClient> logger,
        IOptions<FhirClientOptions> options)
    {
        _httpClient = httpClient;
        _logger = logger;
        _options = options.Value;
    }

    // ─── GetPatientAsync ─────────────────────────────────────────────────────

    public async Task<FhirPatient?> GetPatientAsync(
        string patientId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"Patient/{patientId}", cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "[athena] Failed to get patient {PatientId}: {StatusCode}",
                    patientId, response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            return JsonSerializer.Deserialize<FhirPatient>(content, FhirJsonOptions.Default);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[athena] Error fetching patient {PatientId}", patientId);
            return null;
        }
    }

    // ─── GetObservationsAsync ─────────────────────────────────────────────────

    /// <summary>
    /// Returns laboratory observations.
    /// athena NOTE: Vitals and labs share the same endpoint — filter by category=laboratory
    /// for lab results, category=vital-signs for vitals. Both use LOINC codes.
    /// </summary>
    public async Task<IReadOnlyList<FhirObservation>> GetObservationsAsync(
        string patientId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"Observation?patient={patientId}&category=laboratory&_sort=-date&_count=100",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "[athena] Failed to get observations for patient {PatientId}: {StatusCode}",
                    patientId, response.StatusCode);
                return Array.Empty<FhirObservation>();
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var bundle = JsonSerializer.Deserialize<FhirBundle<FhirObservation>>(content, FhirJsonOptions.Default);
            return bundle?.Entry?.Select(e => e.Resource).ToList() ?? new List<FhirObservation>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[athena] Error fetching observations for patient {PatientId}", patientId);
            return Array.Empty<FhirObservation>();
        }
    }

    // ─── GetMedicationsAsync ──────────────────────────────────────────────────

    /// <summary>
    /// Returns active medication requests.
    /// athena uses status=active for current and status=stopped for discontinued.
    /// Only querying active here — call with status=stopped,cancelled for full history.
    /// </summary>
    public async Task<IReadOnlyList<FhirMedicationRequest>> GetMedicationsAsync(
        string patientId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"MedicationRequest?patient={patientId}&status=active",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
                return Array.Empty<FhirMedicationRequest>();

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var bundle = JsonSerializer.Deserialize<FhirBundle<FhirMedicationRequest>>(content, FhirJsonOptions.Default);
            return bundle?.Entry?.Select(e => e.Resource).ToList() ?? new List<FhirMedicationRequest>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[athena] Error fetching medications for patient {PatientId}", patientId);
            return Array.Empty<FhirMedicationRequest>();
        }
    }

    // ─── GetConditionsAsync ───────────────────────────────────────────────────

    public async Task<IReadOnlyList<FhirCondition>> GetConditionsAsync(
        string patientId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"Condition?patient={patientId}&clinical-status=active",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
                return Array.Empty<FhirCondition>();

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var bundle = JsonSerializer.Deserialize<FhirBundle<FhirCondition>>(content, FhirJsonOptions.Default);
            return bundle?.Entry?.Select(e => e.Resource).ToList() ?? new List<FhirCondition>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[athena] Error fetching conditions for patient {PatientId}", patientId);
            return Array.Empty<FhirCondition>();
        }
    }

    // ─── GetAllergiesAsync ────────────────────────────────────────────────────

    /// <summary>
    /// Returns allergy intolerances, filtering out athena's NKA sentinel record.
    /// athena represents "no known allergies" as a real AllergyIntolerance resource
    /// with SNOMED code 716186003. This sentinel must be filtered before display
    /// so it does not appear as an actual allergy in the provider UI.
    /// </summary>
    public async Task<IReadOnlyList<FhirAllergyIntolerance>> GetAllergiesAsync(
        string patientId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"AllergyIntolerance?patient={patientId}&clinical-status=active",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
                return Array.Empty<FhirAllergyIntolerance>();

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var bundle = JsonSerializer.Deserialize<FhirBundle<FhirAllergyIntolerance>>(content, FhirJsonOptions.Default);

            var all = bundle?.Entry?.Select(e => e.Resource).ToList() ?? new List<FhirAllergyIntolerance>();

            // Filter out the NKA sentinel — it is not a real allergen
            var filtered = all
                .Where(a => !IsNkaRecord(a))
                .ToList();

            if (all.Count != filtered.Count)
                _logger.LogDebug(
                    "[athena] Filtered {Count} NKA sentinel record(s) for patient {PatientId}",
                    all.Count - filtered.Count, patientId);

            return filtered;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[athena] Error fetching allergies for patient {PatientId}", patientId);
            return Array.Empty<FhirAllergyIntolerance>();
        }
    }

    // ─── SendLabOrderAsync ────────────────────────────────────────────────────

    /// <summary>
    /// Sends a lab order as a FHIR ServiceRequest.
    /// athena does not require the category injection that Cerner does —
    /// the resource is accepted with standard intent/status fields.
    /// </summary>
    public async Task<bool> SendLabOrderAsync(
        FhirServiceRequest labOrder, CancellationToken cancellationToken = default)
    {
        try
        {
            var json = JsonSerializer.Serialize(labOrder, FhirJsonOptions.Default);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/fhir+json");

            var response = await _httpClient.PostAsync("ServiceRequest", content, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "[athena] Failed to send lab order: {StatusCode}", response.StatusCode);
                return false;
            }

            _logger.LogInformation("[athena] Lab order sent successfully to athenahealth");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[athena] Error sending lab order to athenahealth");
            return false;
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /// <summary>
    /// Returns true if the allergy resource is athena's NKA sentinel.
    /// Matches SNOMED 716186003 in any coding position.
    /// </summary>
    private static bool IsNkaRecord(FhirAllergyIntolerance allergy)
        => allergy.Code?.Coding?.Any(c => c.Code == NkaSnomed) == true;
}
