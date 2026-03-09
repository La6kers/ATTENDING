using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ATTENDING.Infrastructure.External.FHIR;

/// <summary>
/// FHIR R4 client for EHR integration
/// </summary>
public interface IFhirClient
{
    Task<FhirPatient?> GetPatientAsync(string patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FhirObservation>> GetObservationsAsync(string patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FhirMedicationRequest>> GetMedicationsAsync(string patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FhirCondition>> GetConditionsAsync(string patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FhirAllergyIntolerance>> GetAllergiesAsync(string patientId, CancellationToken cancellationToken = default);
    Task<bool> SendLabOrderAsync(FhirServiceRequest labOrder, CancellationToken cancellationToken = default);
}

/// <summary>
/// Epic FHIR R4 client implementation
/// </summary>
public class EpicFhirClient : IFhirClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<EpicFhirClient> _logger;
    private readonly FhirClientOptions _options;

    public EpicFhirClient(
        HttpClient httpClient,
        ILogger<EpicFhirClient> logger,
        IOptions<FhirClientOptions> options)
    {
        _httpClient = httpClient;
        _logger = logger;
        _options = options.Value;
    }

    public async Task<FhirPatient?> GetPatientAsync(string patientId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"Patient/{patientId}", cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get patient {PatientId}: {StatusCode}", patientId, response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<FhirPatient>(content, FhirJsonOptions.Default);
            if (result is null)
            {
                _logger.LogWarning("Unexpected response format deserializing Patient {PatientId}: result was null", patientId);
                return null;
            }
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching patient {PatientId} from Epic", patientId);
            return null;
        }
    }

    public async Task<IReadOnlyList<FhirObservation>> GetObservationsAsync(string patientId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"Observation?patient={patientId}&category=laboratory&_sort=-date&_count=100",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get observations for patient {PatientId}", patientId);
                return Array.Empty<FhirObservation>();
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var bundle = JsonSerializer.Deserialize<FhirBundle<FhirObservation>>(content, FhirJsonOptions.Default);
            if (bundle is null)
            {
                _logger.LogWarning("Unexpected response format deserializing Observation bundle for patient {PatientId}", patientId);
                return Array.Empty<FhirObservation>();
            }
            return bundle.Entry?.Select(e => e.Resource).ToList() ?? new List<FhirObservation>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching observations for patient {PatientId}", patientId);
            return Array.Empty<FhirObservation>();
        }
    }

    public async Task<IReadOnlyList<FhirMedicationRequest>> GetMedicationsAsync(string patientId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"MedicationRequest?patient={patientId}&status=active",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return Array.Empty<FhirMedicationRequest>();
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var bundle = JsonSerializer.Deserialize<FhirBundle<FhirMedicationRequest>>(content, FhirJsonOptions.Default);
            if (bundle is null)
            {
                _logger.LogWarning("Unexpected response format deserializing MedicationRequest bundle for patient {PatientId}", patientId);
                return Array.Empty<FhirMedicationRequest>();
            }
            return bundle.Entry?.Select(e => e.Resource).ToList() ?? new List<FhirMedicationRequest>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching medications for patient {PatientId}", patientId);
            return Array.Empty<FhirMedicationRequest>();
        }
    }

    public async Task<IReadOnlyList<FhirCondition>> GetConditionsAsync(string patientId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"Condition?patient={patientId}&clinical-status=active",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return Array.Empty<FhirCondition>();
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var bundle = JsonSerializer.Deserialize<FhirBundle<FhirCondition>>(content, FhirJsonOptions.Default);
            if (bundle is null)
            {
                _logger.LogWarning("Unexpected response format deserializing Condition bundle for patient {PatientId}", patientId);
                return Array.Empty<FhirCondition>();
            }
            return bundle.Entry?.Select(e => e.Resource).ToList() ?? new List<FhirCondition>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching conditions for patient {PatientId}", patientId);
            return Array.Empty<FhirCondition>();
        }
    }

    public async Task<IReadOnlyList<FhirAllergyIntolerance>> GetAllergiesAsync(string patientId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"AllergyIntolerance?patient={patientId}&clinical-status=active",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return Array.Empty<FhirAllergyIntolerance>();
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var bundle = JsonSerializer.Deserialize<FhirBundle<FhirAllergyIntolerance>>(content, FhirJsonOptions.Default);
            if (bundle is null)
            {
                _logger.LogWarning("Unexpected response format deserializing AllergyIntolerance bundle for patient {PatientId}", patientId);
                return Array.Empty<FhirAllergyIntolerance>();
            }
            return bundle.Entry?.Select(e => e.Resource).ToList() ?? new List<FhirAllergyIntolerance>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching allergies for patient {PatientId}", patientId);
            return Array.Empty<FhirAllergyIntolerance>();
        }
    }

    public async Task<bool> SendLabOrderAsync(FhirServiceRequest labOrder, CancellationToken cancellationToken = default)
    {
        try
        {
            var json = JsonSerializer.Serialize(labOrder, FhirJsonOptions.Default);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/fhir+json");

            var response = await _httpClient.PostAsync("ServiceRequest", content, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to send lab order: {StatusCode}", response.StatusCode);
                return false;
            }

            // Check for OperationOutcome with error/fatal severity in a 2xx response
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            if (responseBody.Contains("\"OperationOutcome\"") &&
                (responseBody.Contains("\"error\"") || responseBody.Contains("\"fatal\"")))
            {
                _logger.LogWarning("Epic returned OperationOutcome with error/fatal severity in 2xx response: {Body}", responseBody);
                return false;
            }

            _logger.LogInformation("Lab order sent successfully to Epic");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending lab order to Epic");
            return false;
        }
    }
}

/// <summary>
/// Oracle Health (Cerner) FHIR R4 client implementation.
///
/// Key Cerner differences from Epic:
///   1. Patient MRN identifier: no stable system URL across tenants.
///      Extract by type.coding.code == "MR" (HL7 v2 identifier type table).
///   2. Vital signs use the same LOINC codes as Epic — no change required.
///   3. Sandbox tenant: ec2458f2-1e24-41c8-b71b-0e701af7583d
///      Base URL: https://fhir-ehr.cerner.com/r4/{tenantId}
///   4. ServiceRequest for lab orders requires a category element that
///      Cerner validates more strictly than Epic.
///
/// The HttpClient is pre-configured (base URL, Authorization header) by
/// DependencyInjection.cs — this class only constructs FHIR queries.
/// </summary>
public class OracleHealthFhirClient : IFhirClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<OracleHealthFhirClient> _logger;
    private readonly FhirClientOptions _options;

    public OracleHealthFhirClient(
        HttpClient httpClient,
        ILogger<OracleHealthFhirClient> logger,
        IOptions<FhirClientOptions> options)
    {
        _httpClient = httpClient;
        _logger = logger;
        _options = options.Value;
    }

    public async Task<FhirPatient?> GetPatientAsync(string patientId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"Patient/{patientId}", cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "[Cerner] Failed to get patient {PatientId}: {StatusCode}",
                    patientId, response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<FhirPatient>(content, FhirJsonOptions.Default);
            if (result is null)
            {
                _logger.LogWarning("[Cerner] Unexpected response format deserializing Patient {PatientId}: result was null", patientId);
                return null;
            }
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Cerner] Error fetching patient {PatientId}", patientId);
            return null;
        }
    }

    public async Task<IReadOnlyList<FhirObservation>> GetObservationsAsync(string patientId, CancellationToken cancellationToken = default)
    {
        try
        {
            // Cerner accepts the same category and sort parameters as Epic for FHIR R4
            var response = await _httpClient.GetAsync(
                $"Observation?patient={patientId}&category=laboratory&_sort=-date&_count=100",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("[Cerner] Failed to get observations for patient {PatientId}", patientId);
                return Array.Empty<FhirObservation>();
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var bundle = JsonSerializer.Deserialize<FhirBundle<FhirObservation>>(content, FhirJsonOptions.Default);
            if (bundle is null)
            {
                _logger.LogWarning("[Cerner] Unexpected response format deserializing Observation bundle for patient {PatientId}", patientId);
                return Array.Empty<FhirObservation>();
            }
            return bundle.Entry?.Select(e => e.Resource).ToList() ?? new List<FhirObservation>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Cerner] Error fetching observations for patient {PatientId}", patientId);
            return Array.Empty<FhirObservation>();
        }
    }

    public async Task<IReadOnlyList<FhirMedicationRequest>> GetMedicationsAsync(string patientId, CancellationToken cancellationToken = default)
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
            if (bundle is null)
            {
                _logger.LogWarning("[Cerner] Unexpected response format deserializing MedicationRequest bundle for patient {PatientId}", patientId);
                return Array.Empty<FhirMedicationRequest>();
            }
            return bundle.Entry?.Select(e => e.Resource).ToList() ?? new List<FhirMedicationRequest>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Cerner] Error fetching medications for patient {PatientId}", patientId);
            return Array.Empty<FhirMedicationRequest>();
        }
    }

    public async Task<IReadOnlyList<FhirCondition>> GetConditionsAsync(string patientId, CancellationToken cancellationToken = default)
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
            if (bundle is null)
            {
                _logger.LogWarning("[Cerner] Unexpected response format deserializing Condition bundle for patient {PatientId}", patientId);
                return Array.Empty<FhirCondition>();
            }
            return bundle.Entry?.Select(e => e.Resource).ToList() ?? new List<FhirCondition>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Cerner] Error fetching conditions for patient {PatientId}", patientId);
            return Array.Empty<FhirCondition>();
        }
    }

    public async Task<IReadOnlyList<FhirAllergyIntolerance>> GetAllergiesAsync(string patientId, CancellationToken cancellationToken = default)
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
            if (bundle is null)
            {
                _logger.LogWarning("[Cerner] Unexpected response format deserializing AllergyIntolerance bundle for patient {PatientId}", patientId);
                return Array.Empty<FhirAllergyIntolerance>();
            }
            return bundle.Entry?.Select(e => e.Resource).ToList() ?? new List<FhirAllergyIntolerance>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Cerner] Error fetching allergies for patient {PatientId}", patientId);
            return Array.Empty<FhirAllergyIntolerance>();
        }
    }

    public async Task<bool> SendLabOrderAsync(FhirServiceRequest labOrder, CancellationToken cancellationToken = default)
    {
        try
        {
            // Cerner requires a category element on ServiceRequest
            // Add "laboratory" category if the caller didn't supply one
            if (labOrder.Category == null || labOrder.Category.Count == 0)
            {
                labOrder.Category = new List<FhirCodeableConcept>
                {
                    new()
                    {
                        Coding = new List<FhirCoding>
                        {
                            new()
                            {
                                System = "http://snomed.info/sct",
                                Code = "108252007",
                                Display = "Laboratory procedure"
                            }
                        }
                    }
                };
            }

            var json = JsonSerializer.Serialize(labOrder, FhirJsonOptions.Default);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/fhir+json");

            var response = await _httpClient.PostAsync("ServiceRequest", content, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("[Cerner] Failed to send lab order: {StatusCode}", response.StatusCode);
                return false;
            }

            // Check for OperationOutcome with error/fatal severity in a 2xx response
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            if (responseBody.Contains("\"OperationOutcome\"") &&
                (responseBody.Contains("\"error\"") || responseBody.Contains("\"fatal\"")))
            {
                _logger.LogWarning("[Cerner] Oracle Health returned OperationOutcome with error/fatal severity in 2xx response: {Body}", responseBody);
                return false;
            }

            _logger.LogInformation("[Cerner] Lab order sent successfully to Oracle Health");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Cerner] Error sending lab order to Oracle Health");
            return false;
        }
    }
}

#region FHIR R4 Models

public class FhirBundle<T>
{
    [JsonPropertyName("resourceType")]
    public string ResourceType { get; set; } = "Bundle";
    
    [JsonPropertyName("entry")]
    public List<FhirBundleEntry<T>>? Entry { get; set; }
}

public class FhirBundleEntry<T>
{
    [JsonPropertyName("resource")]
    public T Resource { get; set; } = default!;
}

public class FhirPatient
{
    [JsonPropertyName("resourceType")]
    public string ResourceType { get; set; } = "Patient";
    
    [JsonPropertyName("id")]
    public string? Id { get; set; }
    
    [JsonPropertyName("identifier")]
    public List<FhirIdentifier>? Identifier { get; set; }
    
    [JsonPropertyName("name")]
    public List<FhirHumanName>? Name { get; set; }
    
    [JsonPropertyName("birthDate")]
    public string? BirthDate { get; set; }
    
    [JsonPropertyName("gender")]
    public string? Gender { get; set; }
    
    [JsonPropertyName("telecom")]
    public List<FhirContactPoint>? Telecom { get; set; }
    
    [JsonPropertyName("address")]
    public List<FhirAddress>? Address { get; set; }
}

public class FhirIdentifier
{
    [JsonPropertyName("system")]
    public string? System { get; set; }
    
    [JsonPropertyName("value")]
    public string? Value { get; set; }
}

public class FhirHumanName
{
    [JsonPropertyName("family")]
    public string? Family { get; set; }
    
    [JsonPropertyName("given")]
    public List<string>? Given { get; set; }
}

public class FhirContactPoint
{
    [JsonPropertyName("system")]
    public string? System { get; set; }
    
    [JsonPropertyName("value")]
    public string? Value { get; set; }
}

public class FhirAddress
{
    [JsonPropertyName("line")]
    public List<string>? Line { get; set; }
    
    [JsonPropertyName("city")]
    public string? City { get; set; }
    
    [JsonPropertyName("state")]
    public string? State { get; set; }
    
    [JsonPropertyName("postalCode")]
    public string? PostalCode { get; set; }
}

public class FhirObservation
{
    [JsonPropertyName("resourceType")]
    public string ResourceType { get; set; } = "Observation";
    
    [JsonPropertyName("id")]
    public string? Id { get; set; }
    
    [JsonPropertyName("status")]
    public string? Status { get; set; }
    
    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }
    
    [JsonPropertyName("valueQuantity")]
    public FhirQuantity? ValueQuantity { get; set; }
    
    [JsonPropertyName("valueString")]
    public string? ValueString { get; set; }
    
    [JsonPropertyName("effectiveDateTime")]
    public string? EffectiveDateTime { get; set; }
    
    [JsonPropertyName("interpretation")]
    public List<FhirCodeableConcept>? Interpretation { get; set; }
}

public class FhirCodeableConcept
{
    [JsonPropertyName("coding")]
    public List<FhirCoding>? Coding { get; set; }
    
    [JsonPropertyName("text")]
    public string? Text { get; set; }
}

public class FhirCoding
{
    [JsonPropertyName("system")]
    public string? System { get; set; }
    
    [JsonPropertyName("code")]
    public string? Code { get; set; }
    
    [JsonPropertyName("display")]
    public string? Display { get; set; }
}

public class FhirQuantity
{
    [JsonPropertyName("value")]
    public decimal? Value { get; set; }
    
    [JsonPropertyName("unit")]
    public string? Unit { get; set; }
}

public class FhirMedicationRequest
{
    [JsonPropertyName("resourceType")]
    public string ResourceType { get; set; } = "MedicationRequest";
    
    [JsonPropertyName("id")]
    public string? Id { get; set; }
    
    [JsonPropertyName("status")]
    public string? Status { get; set; }
    
    [JsonPropertyName("medicationCodeableConcept")]
    public FhirCodeableConcept? MedicationCodeableConcept { get; set; }
    
    [JsonPropertyName("dosageInstruction")]
    public List<FhirDosage>? DosageInstruction { get; set; }
}

public class FhirDosage
{
    [JsonPropertyName("text")]
    public string? Text { get; set; }
    
    [JsonPropertyName("timing")]
    public FhirTiming? Timing { get; set; }
}

public class FhirTiming
{
    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }
}

public class FhirCondition
{
    [JsonPropertyName("resourceType")]
    public string ResourceType { get; set; } = "Condition";
    
    [JsonPropertyName("id")]
    public string? Id { get; set; }
    
    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }
    
    [JsonPropertyName("onsetDateTime")]
    public string? OnsetDateTime { get; set; }
}

public class FhirAllergyIntolerance
{
    [JsonPropertyName("resourceType")]
    public string ResourceType { get; set; } = "AllergyIntolerance";
    
    [JsonPropertyName("id")]
    public string? Id { get; set; }
    
    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }
    
    [JsonPropertyName("reaction")]
    public List<FhirAllergyReaction>? Reaction { get; set; }
    
    [JsonPropertyName("criticality")]
    public string? Criticality { get; set; }
}

public class FhirAllergyReaction
{
    [JsonPropertyName("manifestation")]
    public List<FhirCodeableConcept>? Manifestation { get; set; }
    
    [JsonPropertyName("severity")]
    public string? Severity { get; set; }
}

public class FhirServiceRequest
{
    [JsonPropertyName("resourceType")]
    public string ResourceType { get; set; } = "ServiceRequest";
    
    [JsonPropertyName("status")]
    public string Status { get; set; } = "active";
    
    [JsonPropertyName("intent")]
    public string Intent { get; set; } = "order";
    
    [JsonPropertyName("priority")]
    public string? Priority { get; set; }
    
    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }
    
    [JsonPropertyName("subject")]
    public FhirReference? Subject { get; set; }
    
    [JsonPropertyName("requester")]
    public FhirReference? Requester { get; set; }
    
    [JsonPropertyName("category")]
    public List<FhirCodeableConcept>? Category { get; set; }

    [JsonPropertyName("reasonCode")]
    public List<FhirCodeableConcept>? ReasonCode { get; set; }
}

public class FhirReference
{
    [JsonPropertyName("reference")]
    public string? Reference { get; set; }
    
    [JsonPropertyName("display")]
    public string? Display { get; set; }
}

#endregion

#region Configuration

public class FhirClientOptions
{
    public string BaseUrl { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string TokenEndpoint { get; set; } = string.Empty;
    public string Scope { get; set; } = "system/*.read system/ServiceRequest.write";
}

public static class FhirJsonOptions
{
    public static JsonSerializerOptions Default { get; } = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };
}

#endregion

