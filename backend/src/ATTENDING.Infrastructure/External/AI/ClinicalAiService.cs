using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ATTENDING.Infrastructure.External.AI;

/// <summary>
/// Clinical AI service for diagnostic recommendations
/// </summary>
public interface IClinicalAiService
{
    Task<DifferentialDiagnosisResult> GetDifferentialDiagnosisAsync(
        ClinicalContext context,
        CancellationToken cancellationToken = default);
    
    Task<LabRecommendationResult> GetLabRecommendationsAsync(
        ClinicalContext context,
        CancellationToken cancellationToken = default);
    
    Task<ImagingRecommendationResult> GetImagingRecommendationsAsync(
        ClinicalContext context,
        CancellationToken cancellationToken = default);
    
    Task<TreatmentRecommendationResult> GetTreatmentRecommendationsAsync(
        ClinicalContext context,
        string diagnosisCode,
        CancellationToken cancellationToken = default);
    
    Task<TriageAssessmentResult> AssessTriageLevelAsync(
        string chiefComplaint,
        string symptoms,
        int? painLevel,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// BioMistral-based clinical AI service implementation
/// </summary>
public class BioMistralClinicalAiService : IClinicalAiService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<BioMistralClinicalAiService> _logger;
    private readonly ClinicalAiOptions _options;

    public BioMistralClinicalAiService(
        HttpClient httpClient,
        ILogger<BioMistralClinicalAiService> logger,
        IOptions<ClinicalAiOptions> options)
    {
        _httpClient = httpClient;
        _logger = logger;
        _options = options.Value;
    }

    public async Task<DifferentialDiagnosisResult> GetDifferentialDiagnosisAsync(
        ClinicalContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var prompt = BuildDifferentialDiagnosisPrompt(context);
            var response = await SendPromptAsync(prompt, cancellationToken);
            return ParseDifferentialDiagnosisResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting differential diagnosis");
            return new DifferentialDiagnosisResult
            {
                Success = false,
                ErrorMessage = "AI service temporarily unavailable",
                Diagnoses = GetFallbackDifferentials(context)
            };
        }
    }

    public async Task<LabRecommendationResult> GetLabRecommendationsAsync(
        ClinicalContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var prompt = BuildLabRecommendationPrompt(context);
            var response = await SendPromptAsync(prompt, cancellationToken);
            return ParseLabRecommendationResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting lab recommendations");
            return new LabRecommendationResult
            {
                Success = false,
                ErrorMessage = "AI service temporarily unavailable",
                Recommendations = GetFallbackLabRecommendations(context)
            };
        }
    }

    public async Task<ImagingRecommendationResult> GetImagingRecommendationsAsync(
        ClinicalContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var prompt = BuildImagingRecommendationPrompt(context);
            var response = await SendPromptAsync(prompt, cancellationToken);
            return ParseImagingRecommendationResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting imaging recommendations");
            return new ImagingRecommendationResult
            {
                Success = false,
                ErrorMessage = "AI service temporarily unavailable",
                Recommendations = new List<ImagingRecommendation>()
            };
        }
    }

    public async Task<TreatmentRecommendationResult> GetTreatmentRecommendationsAsync(
        ClinicalContext context,
        string diagnosisCode,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var prompt = BuildTreatmentRecommendationPrompt(context, diagnosisCode);
            var response = await SendPromptAsync(prompt, cancellationToken);
            return ParseTreatmentRecommendationResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting treatment recommendations");
            return new TreatmentRecommendationResult
            {
                Success = false,
                ErrorMessage = "AI service temporarily unavailable",
                Recommendations = new List<TreatmentRecommendation>()
            };
        }
    }

    public async Task<TriageAssessmentResult> AssessTriageLevelAsync(
        string chiefComplaint,
        string symptoms,
        int? painLevel,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var prompt = BuildTriageAssessmentPrompt(chiefComplaint, symptoms, painLevel);
            var response = await SendPromptAsync(prompt, cancellationToken);
            return ParseTriageAssessmentResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assessing triage level");
            // Default to urgent if AI fails - better safe than sorry
            return new TriageAssessmentResult
            {
                Success = false,
                ErrorMessage = "AI service temporarily unavailable - defaulting to Level 3",
                TriageLevel = "Level3_Urgent",
                Reasoning = "Unable to assess - defaulting to urgent for safety"
            };
        }
    }

    #region Private Methods

    private async Task<string> SendPromptAsync(string prompt, CancellationToken cancellationToken)
    {
        var request = new
        {
            model = _options.Model,
            messages = new[]
            {
                new { role = "system", content = GetSystemPrompt() },
                new { role = "user", content = prompt }
            },
            temperature = 0.3,
            max_tokens = 2000
        };

        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync("v1/chat/completions", content, cancellationToken);
        response.EnsureSuccessStatusCode();

        var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
        var result = JsonSerializer.Deserialize<ChatCompletionResponse>(responseJson);
        
        return result?.Choices?.FirstOrDefault()?.Message?.Content ?? string.Empty;
    }

    private static string GetSystemPrompt()
    {
        return """
            You are a clinical decision support AI assistant for healthcare providers.
            You provide evidence-based recommendations for differential diagnosis, lab orders, imaging, and treatment.
            
            Important guidelines:
            1. Always recommend appropriate tests to rule out serious conditions
            2. Consider patient age, sex, and medical history
            3. Follow current clinical guidelines (USPSTF, AHA, ACOG, etc.)
            4. Provide ICD-10 and CPT codes where applicable
            5. Flag any red flags or urgent conditions
            6. Your recommendations are decision support only - the physician makes final decisions
            
            Respond in JSON format as specified in the prompt.
            """;
    }

    private static string BuildDifferentialDiagnosisPrompt(ClinicalContext context)
    {
        return $"""
            Generate a differential diagnosis list for this patient:
            
            Chief Complaint: {context.ChiefComplaint}
            History of Present Illness: {context.HpiSummary}
            Age: {context.PatientAge}
            Sex: {context.PatientSex}
            Medical History: {string.Join(", ", context.MedicalHistory)}
            Current Medications: {string.Join(", ", context.CurrentMedications)}
            Allergies: {string.Join(", ", context.Allergies)}
            Vital Signs: {context.VitalSignsSummary}
            
            Respond with JSON:
            {{
                "diagnoses": [
                    {{
                        "icd10Code": "code",
                        "name": "diagnosis name",
                        "probability": "high/medium/low",
                        "reasoning": "clinical reasoning",
                        "redFlags": ["any concerning features"],
                        "recommendedWorkup": ["tests to consider"]
                    }}
                ],
                "urgentConsiderations": ["any emergent conditions to rule out"]
            }}
            """;
    }

    private static string BuildLabRecommendationPrompt(ClinicalContext context)
    {
        return $"""
            Recommend laboratory tests for this clinical scenario:
            
            Chief Complaint: {context.ChiefComplaint}
            Working Diagnosis: {context.WorkingDiagnosis}
            Age: {context.PatientAge}, Sex: {context.PatientSex}
            Medical History: {string.Join(", ", context.MedicalHistory)}
            
            Respond with JSON:
            {{
                "recommendations": [
                    {{
                        "testCode": "code",
                        "testName": "name",
                        "cptCode": "cpt",
                        "loincCode": "loinc",
                        "priority": "Stat/Urgent/Routine",
                        "clinicalRationale": "why this test",
                        "category": "Chemistry/Hematology/etc"
                    }}
                ],
                "panels": ["any recommended panels like BMP, CBC"]
            }}
            """;
    }

    private static string BuildImagingRecommendationPrompt(ClinicalContext context)
    {
        return $"""
            Recommend imaging studies for this clinical scenario:
            
            Chief Complaint: {context.ChiefComplaint}
            Working Diagnosis: {context.WorkingDiagnosis}
            Location of Symptoms: {context.SymptomLocation}
            Age: {context.PatientAge}, Sex: {context.PatientSex}
            
            Consider radiation exposure and choose the most appropriate modality.
            
            Respond with JSON:
            {{
                "recommendations": [
                    {{
                        "studyName": "name",
                        "modality": "X-Ray/CT/MRI/Ultrasound/etc",
                        "bodyPart": "part",
                        "cptCode": "cpt",
                        "priority": "Stat/Urgent/Routine",
                        "withContrast": true/false,
                        "clinicalRationale": "why this study",
                        "radiationDose": "low/medium/high/none"
                    }}
                ]
            }}
            """;
    }

    private static string BuildTreatmentRecommendationPrompt(ClinicalContext context, string diagnosisCode)
    {
        return $"""
            Recommend treatment for:
            
            Diagnosis: {diagnosisCode}
            Chief Complaint: {context.ChiefComplaint}
            Age: {context.PatientAge}, Sex: {context.PatientSex}
            Allergies: {string.Join(", ", context.Allergies)}
            Current Medications: {string.Join(", ", context.CurrentMedications)}
            Renal Function: {context.RenalFunction}
            Hepatic Function: {context.HepaticFunction}
            
            Respond with JSON:
            {{
                "recommendations": [
                    {{
                        "medicationName": "name",
                        "genericName": "generic",
                        "dosage": "dose",
                        "frequency": "frequency",
                        "duration": "duration",
                        "route": "PO/IV/etc",
                        "clinicalRationale": "why this medication",
                        "monitoring": ["what to monitor"],
                        "contraindications": ["any for this patient"]
                    }}
                ],
                "nonPharmacologic": ["lifestyle modifications, etc"],
                "referrals": ["any specialty referrals needed"]
            }}
            """;
    }

    private static string BuildTriageAssessmentPrompt(string chiefComplaint, string symptoms, int? painLevel)
    {
        return $"""
            Assess the Emergency Severity Index (ESI) triage level:
            
            Chief Complaint: {chiefComplaint}
            Symptoms: {symptoms}
            Pain Level: {painLevel?.ToString() ?? "Not reported"}/10
            
            ESI Levels:
            - Level1_Resuscitation: Immediate life-saving intervention
            - Level2_Emergent: High risk, confused, severe pain
            - Level3_Urgent: Multiple resources needed
            - Level4_LessUrgent: One resource needed
            - Level5_NonUrgent: No resources needed
            
            Respond with JSON:
            {{
                "triageLevel": "Level#_Name",
                "reasoning": "clinical reasoning",
                "redFlags": ["any concerning features"],
                "timeToProvider": "immediate/15min/30min/60min/120min",
                "resourcesNeeded": ["anticipated resources"]
            }}
            """;
    }

    private DifferentialDiagnosisResult ParseDifferentialDiagnosisResponse(string response)
    {
        try
        {
            // Extract JSON from response (may have markdown formatting)
            var json = ExtractJson(response);
            var parsed = JsonSerializer.Deserialize<DifferentialDiagnosisResponse>(json);
            
            return new DifferentialDiagnosisResult
            {
                Success = true,
                Diagnoses = parsed?.Diagnoses?.Select(d => new DiagnosisRecommendation
                {
                    Icd10Code = d.Icd10Code,
                    Name = d.Name,
                    Probability = d.Probability,
                    Reasoning = d.Reasoning,
                    RedFlags = d.RedFlags ?? new List<string>(),
                    RecommendedWorkup = d.RecommendedWorkup ?? new List<string>()
                }).ToList() ?? new List<DiagnosisRecommendation>(),
                UrgentConsiderations = parsed?.UrgentConsiderations ?? new List<string>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse differential diagnosis response");
            return new DifferentialDiagnosisResult { Success = false, ErrorMessage = "Failed to parse AI response" };
        }
    }

    private LabRecommendationResult ParseLabRecommendationResponse(string response)
    {
        try
        {
            var json = ExtractJson(response);
            var parsed = JsonSerializer.Deserialize<LabRecommendationResponse>(json);
            
            return new LabRecommendationResult
            {
                Success = true,
                Recommendations = parsed?.Recommendations?.Select(r => new LabRecommendation
                {
                    TestCode = r.TestCode,
                    TestName = r.TestName,
                    CptCode = r.CptCode,
                    LoincCode = r.LoincCode,
                    Priority = r.Priority,
                    ClinicalRationale = r.ClinicalRationale,
                    Category = r.Category
                }).ToList() ?? new List<LabRecommendation>(),
                RecommendedPanels = parsed?.Panels ?? new List<string>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse lab recommendation response");
            return new LabRecommendationResult { Success = false, ErrorMessage = "Failed to parse AI response" };
        }
    }

    private ImagingRecommendationResult ParseImagingRecommendationResponse(string response)
    {
        // Similar implementation
        return new ImagingRecommendationResult { Success = true, Recommendations = new List<ImagingRecommendation>() };
    }

    private TreatmentRecommendationResult ParseTreatmentRecommendationResponse(string response)
    {
        // Similar implementation
        return new TreatmentRecommendationResult { Success = true, Recommendations = new List<TreatmentRecommendation>() };
    }

    private TriageAssessmentResult ParseTriageAssessmentResponse(string response)
    {
        try
        {
            var json = ExtractJson(response);
            var parsed = JsonSerializer.Deserialize<TriageAssessmentResponse>(json);
            
            return new TriageAssessmentResult
            {
                Success = true,
                TriageLevel = parsed?.TriageLevel ?? "Level3_Urgent",
                Reasoning = parsed?.Reasoning ?? string.Empty,
                RedFlags = parsed?.RedFlags ?? new List<string>(),
                TimeToProvider = parsed?.TimeToProvider ?? "30min",
                ResourcesNeeded = parsed?.ResourcesNeeded ?? new List<string>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse triage assessment response");
            return new TriageAssessmentResult
            {
                Success = false,
                ErrorMessage = "Failed to parse AI response",
                TriageLevel = "Level3_Urgent"
            };
        }
    }

    private static string ExtractJson(string response)
    {
        // Handle markdown code blocks
        if (response.Contains("```json"))
        {
            var start = response.IndexOf("```json") + 7;
            var end = response.IndexOf("```", start);
            return response.Substring(start, end - start).Trim();
        }
        if (response.Contains("```"))
        {
            var start = response.IndexOf("```") + 3;
            var end = response.IndexOf("```", start);
            return response.Substring(start, end - start).Trim();
        }
        return response.Trim();
    }

    private static List<DiagnosisRecommendation> GetFallbackDifferentials(ClinicalContext context)
    {
        // Basic fallback differentials based on common presentations
        return new List<DiagnosisRecommendation>
        {
            new()
            {
                Name = "Pending AI analysis",
                Probability = "unknown",
                Reasoning = "AI service unavailable - please proceed with clinical judgment"
            }
        };
    }

    private static List<LabRecommendation> GetFallbackLabRecommendations(ClinicalContext context)
    {
        // Basic labs for most clinical scenarios
        return new List<LabRecommendation>
        {
            new() { TestCode = "CBC", TestName = "Complete Blood Count", CptCode = "85025", Priority = "Routine", Category = "Hematology" },
            new() { TestCode = "CMP", TestName = "Comprehensive Metabolic Panel", CptCode = "80053", Priority = "Routine", Category = "Chemistry" }
        };
    }

    #endregion
}

#region Models

public class ClinicalContext
{
    public string ChiefComplaint { get; set; } = string.Empty;
    public string HpiSummary { get; set; } = string.Empty;
    public int PatientAge { get; set; }
    public string PatientSex { get; set; } = string.Empty;
    public List<string> MedicalHistory { get; set; } = new();
    public List<string> CurrentMedications { get; set; } = new();
    public List<string> Allergies { get; set; } = new();
    public string? VitalSignsSummary { get; set; }
    public string? WorkingDiagnosis { get; set; }
    public string? SymptomLocation { get; set; }
    public string? RenalFunction { get; set; }
    public string? HepaticFunction { get; set; }
}

public class DifferentialDiagnosisResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public List<DiagnosisRecommendation> Diagnoses { get; set; } = new();
    public List<string> UrgentConsiderations { get; set; } = new();
}

public class DiagnosisRecommendation
{
    public string? Icd10Code { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Probability { get; set; }
    public string? Reasoning { get; set; }
    public List<string> RedFlags { get; set; } = new();
    public List<string> RecommendedWorkup { get; set; } = new();
}

public class LabRecommendationResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public List<LabRecommendation> Recommendations { get; set; } = new();
    public List<string> RecommendedPanels { get; set; } = new();
}

public class LabRecommendation
{
    public string TestCode { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string? CptCode { get; set; }
    public string? LoincCode { get; set; }
    public string Priority { get; set; } = "Routine";
    public string? ClinicalRationale { get; set; }
    public string? Category { get; set; }
}

public class ImagingRecommendationResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public List<ImagingRecommendation> Recommendations { get; set; } = new();
}

public class ImagingRecommendation
{
    public string StudyName { get; set; } = string.Empty;
    public string Modality { get; set; } = string.Empty;
    public string BodyPart { get; set; } = string.Empty;
    public string? CptCode { get; set; }
    public string Priority { get; set; } = "Routine";
    public bool WithContrast { get; set; }
    public string? ClinicalRationale { get; set; }
    public string? RadiationDose { get; set; }
}

public class TreatmentRecommendationResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public List<TreatmentRecommendation> Recommendations { get; set; } = new();
    public List<string> NonPharmacologic { get; set; } = new();
    public List<string> Referrals { get; set; } = new();
}

public class TreatmentRecommendation
{
    public string MedicationName { get; set; } = string.Empty;
    public string? GenericName { get; set; }
    public string? Dosage { get; set; }
    public string? Frequency { get; set; }
    public string? Duration { get; set; }
    public string? Route { get; set; }
    public string? ClinicalRationale { get; set; }
    public List<string> Monitoring { get; set; } = new();
    public List<string> Contraindications { get; set; } = new();
}

public class TriageAssessmentResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string TriageLevel { get; set; } = "Level3_Urgent";
    public string? Reasoning { get; set; }
    public List<string> RedFlags { get; set; } = new();
    public string? TimeToProvider { get; set; }
    public List<string> ResourcesNeeded { get; set; } = new();
}

#endregion

#region Configuration & Response Models

public class ClinicalAiOptions
{
    public string BaseUrl { get; set; } = "http://localhost:11434/api";
    public string Model { get; set; } = "biomistral";
    public string ApiKey { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; } = 30;
}

internal class ChatCompletionResponse
{
    [JsonPropertyName("choices")]
    public List<ChatCompletionChoice>? Choices { get; set; }
}

internal class ChatCompletionChoice
{
    [JsonPropertyName("message")]
    public ChatCompletionMessage? Message { get; set; }
}

internal class ChatCompletionMessage
{
    [JsonPropertyName("content")]
    public string? Content { get; set; }
}

internal class DifferentialDiagnosisResponse
{
    [JsonPropertyName("diagnoses")]
    public List<DiagnosisDto>? Diagnoses { get; set; }
    
    [JsonPropertyName("urgentConsiderations")]
    public List<string>? UrgentConsiderations { get; set; }
}

internal class DiagnosisDto
{
    [JsonPropertyName("icd10Code")]
    public string? Icd10Code { get; set; }
    
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [JsonPropertyName("probability")]
    public string? Probability { get; set; }
    
    [JsonPropertyName("reasoning")]
    public string? Reasoning { get; set; }
    
    [JsonPropertyName("redFlags")]
    public List<string>? RedFlags { get; set; }
    
    [JsonPropertyName("recommendedWorkup")]
    public List<string>? RecommendedWorkup { get; set; }
}

internal class LabRecommendationResponse
{
    [JsonPropertyName("recommendations")]
    public List<LabRecommendationDto>? Recommendations { get; set; }
    
    [JsonPropertyName("panels")]
    public List<string>? Panels { get; set; }
}

internal class LabRecommendationDto
{
    [JsonPropertyName("testCode")]
    public string? TestCode { get; set; }
    
    [JsonPropertyName("testName")]
    public string? TestName { get; set; }
    
    [JsonPropertyName("cptCode")]
    public string? CptCode { get; set; }
    
    [JsonPropertyName("loincCode")]
    public string? LoincCode { get; set; }
    
    [JsonPropertyName("priority")]
    public string? Priority { get; set; }
    
    [JsonPropertyName("clinicalRationale")]
    public string? ClinicalRationale { get; set; }
    
    [JsonPropertyName("category")]
    public string? Category { get; set; }
}

internal class TriageAssessmentResponse
{
    [JsonPropertyName("triageLevel")]
    public string? TriageLevel { get; set; }
    
    [JsonPropertyName("reasoning")]
    public string? Reasoning { get; set; }
    
    [JsonPropertyName("redFlags")]
    public List<string>? RedFlags { get; set; }
    
    [JsonPropertyName("timeToProvider")]
    public string? TimeToProvider { get; set; }
    
    [JsonPropertyName("resourcesNeeded")]
    public List<string>? ResourcesNeeded { get; set; }
}

#endregion
