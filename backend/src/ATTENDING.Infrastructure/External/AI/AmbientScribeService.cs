using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Infrastructure.External.AI;

// ═══════════════════════════════════════════════════════════════════════════
// AMBIENT SCRIBE — AI Service Implementation
//
// Converts a diarized encounter transcript into a structured SOAP note.
//
// Model selection:
//   • Production: Anthropic Claude via API (configurable endpoint)
//   • Local/dev: Ollama running BioMistral or llama3
//   • Azure OpenAI: supported via BaseUrl + ApiKey configuration
//
// Prompt strategy:
//   • System prompt defines the physician documentation role
//   • Clinical context (conditions, meds, allergies) is injected as a
//     separate "context" block so the AI grounds its note in known facts
//   • Transcript is injected verbatim after the context block
//   • Output is structured JSON with all four SOAP sections plus
//     optional diagnosis codes, medication extractions, and follow-up
//   • Prompt is capped at MaxTranscriptChars to prevent unbounded token spend
//
// Privacy:
//   • The transcript is sent to the AI but NOT logged (see SendPromptAsync)
//   • Model version + token count are stored on AmbientNote for audit
// ═══════════════════════════════════════════════════════════════════════════

public class AmbientScribeOptions
{
    public string BaseUrl { get; set; } = "https://api.anthropic.com/v1";
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "claude-3-5-haiku-20241022";
    public int MaxTranscriptChars { get; set; } = 24_000; // ~6k tokens
    public int MaxOutputTokens { get; set; } = 2_000;
    public int TimeoutSeconds { get; set; } = 60;
}

public class AnthropicAmbientScribeService : IAmbientScribeService
{
    private readonly HttpClient _httpClient;
    private readonly AmbientScribeOptions _options;
    private readonly ILogger<AnthropicAmbientScribeService> _logger;

    public AnthropicAmbientScribeService(
        HttpClient httpClient,
        IOptions<AmbientScribeOptions> options,
        ILogger<AnthropicAmbientScribeService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;

        _httpClient.Timeout = TimeSpan.FromSeconds(_options.TimeoutSeconds);

        // Anthropic SDK headers
        if (!string.IsNullOrEmpty(_options.ApiKey))
        {
            _httpClient.DefaultRequestHeaders.TryAddWithoutValidation("x-api-key", _options.ApiKey);
            _httpClient.DefaultRequestHeaders.TryAddWithoutValidation("anthropic-version", "2023-06-01");
        }
    }

    public async Task<GeneratedSoapNote?> GenerateSoapNoteAsync(
        IReadOnlyList<TranscriptSegment> segments,
        SoapNoteContext context,
        CancellationToken ct = default)
    {
        if (segments.Count == 0)
        {
            _logger.LogWarning("GenerateSoapNoteAsync called with empty segment list.");
            return null;
        }

        try
        {
            var transcript = BuildTranscript(segments);
            var systemPrompt = GetSystemPrompt();
            var userPrompt = BuildNotePrompt(transcript, context);
            var promptTokenEstimate = EstimateTokens(systemPrompt + userPrompt);

            var response = await SendPromptAsync(systemPrompt, userPrompt, ct);
            if (response == null) return null;

            var note = ParseSoapResponse(response);
            if (note == null) return null;

            return note with
            {
                ModelVersion = _options.Model,
                PromptTokens = promptTokenEstimate
            };
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "Ambient scribe AI call failed (transient).");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in ambient scribe AI service.");
            return null;
        }
    }

    public async Task<bool> IsAvailableAsync(CancellationToken ct = default)
    {
        try
        {
            var testPayload = BuildAnthropicPayload(
                "You are a test.",
                "Reply with the single word: ok",
                maxTokens: 5);

            var json = JsonSerializer.Serialize(testPayload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(
                $"{_options.BaseUrl}/messages", content, ct);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private static string BuildTranscript(IReadOnlyList<TranscriptSegment> segments)
    {
        var sb = new StringBuilder();
        foreach (var seg in segments.OrderBy(s => s.OffsetMs))
        {
            var label = seg.Speaker switch
            {
                SpeakerRole.Provider => "PROVIDER",
                SpeakerRole.Patient => "PATIENT",
                _ => "SPEAKER"
            };
            var time = TimeSpan.FromMilliseconds(seg.OffsetMs);
            sb.AppendLine($"[{time:mm\\:ss}] {label}: {seg.Text}");
        }
        return sb.ToString();
    }

    private string BuildNotePrompt(string transcript, SoapNoteContext ctx)
    {
        // Truncate transcript to prevent unbounded token usage
        var truncated = transcript.Length > _options.MaxTranscriptChars
            ? transcript[.._options.MaxTranscriptChars] + "\n[TRANSCRIPT TRUNCATED — REMAINDER NOT SHOWN]"
            : transcript;

        var sb = new StringBuilder();

        // Clinical context block
        if (ctx.PatientAge.HasValue || ctx.ActiveConditions.Count > 0 || ctx.CurrentMedications.Count > 0)
        {
            sb.AppendLine("=== PATIENT CONTEXT ===");
            if (ctx.PatientAge.HasValue) sb.AppendLine($"Age: {ctx.PatientAge} | Sex: {ctx.PatientSex ?? "unknown"}");
            if (!string.IsNullOrEmpty(ctx.ChiefComplaint)) sb.AppendLine($"Chief Complaint: {ctx.ChiefComplaint}");
            if (ctx.ActiveConditions.Count > 0)
                sb.AppendLine($"Active Conditions: {string.Join(", ", ctx.ActiveConditions.Take(10))}");
            if (ctx.CurrentMedications.Count > 0)
                sb.AppendLine($"Current Medications: {string.Join(", ", ctx.CurrentMedications.Take(15))}");
            if (ctx.Allergies.Count > 0)
                sb.AppendLine($"Allergies: {string.Join(", ", ctx.Allergies.Take(10))}");
            if (!string.IsNullOrEmpty(ctx.EncounterType)) sb.AppendLine($"Visit Type: {ctx.EncounterType}");
            sb.AppendLine();
        }

        sb.AppendLine("=== ENCOUNTER TRANSCRIPT ===");
        sb.AppendLine(truncated);
        sb.AppendLine();
        sb.AppendLine("=== TASK ===");
        sb.AppendLine("Generate a complete SOAP note from the transcript above.");
        sb.AppendLine("Respond ONLY with valid JSON in exactly this structure:");
        sb.AppendLine("""
{
  "subjective": "Chief complaint, HPI in narrative form, ROS, PMH, medications, allergies, social history",
  "objective": "Vital signs (if mentioned), physical exam findings documented by the provider",
  "assessment": "Clinical assessment, working diagnosis or diagnoses with ICD-10 codes if possible",
  "plan": "Specific ordered tests, prescriptions with doses, referrals, follow-up instructions",
  "extractedDiagnosisCodes": "comma-separated ICD-10 codes if identifiable, or null",
  "extractedMedications": "medications prescribed or adjusted in this visit, or null",
  "followUpInstructions": "specific follow-up instructions for the patient, or null"
}
""");
        sb.AppendLine("Capture only what was discussed. Do not fabricate information not in the transcript.");

        return sb.ToString();
    }

    private static string GetSystemPrompt() =>
        """
        You are an expert medical scribe AI. Your task is to generate accurate, 
        professional clinical SOAP notes from encounter transcripts.

        Guidelines:
        - Use formal clinical language appropriate for a medical record
        - Subjective: patient's own words and reported symptoms
        - Objective: measurable findings only (vitals, exam findings from transcript)
        - Assessment: clinical reasoning and diagnoses with ICD-10 codes where possible
        - Plan: specific, actionable — medications with doses, tests ordered, referrals, follow-up timing
        - Do NOT fabricate findings, symptoms, or orders not explicitly mentioned
        - Flag any [unclear] sections where audio was inaudible or ambiguous
        - The physician will review and sign before this becomes a medical record
        
        Respond ONLY with valid JSON. No preamble, no markdown fences.
        """;

    private async Task<string?> SendPromptAsync(
        string systemPrompt, string userPrompt, CancellationToken ct)
    {
        var payload = BuildAnthropicPayload(systemPrompt, userPrompt, _options.MaxOutputTokens);
        var json = JsonSerializer.Serialize(payload);

        // Do NOT log the prompt — it contains PHI (the transcript)
        _logger.LogDebug(
            "Sending ambient scribe request to {Model} (~{Chars} transcript chars)",
            _options.Model, userPrompt.Length);

        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync($"{_options.BaseUrl}/messages", content, ct);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning(
                "Anthropic API returned {Status} for ambient scribe: {Error}",
                response.StatusCode, err[..Math.Min(err.Length, 200)]);
            return null;
        }

        var responseJson = await response.Content.ReadAsStringAsync(ct);
        var parsed = JsonSerializer.Deserialize<AnthropicMessagesResponse>(responseJson);
        return parsed?.Content?.FirstOrDefault(c => c.Type == "text")?.Text;
    }

    private object BuildAnthropicPayload(string system, string user, int maxTokens) =>
        new
        {
            model = _options.Model,
            max_tokens = maxTokens,
            system,
            messages = new[] { new { role = "user", content = user } }
        };

    private GeneratedSoapNote? ParseSoapResponse(string rawResponse)
    {
        try
        {
            var clean = ExtractJson(rawResponse);
            var parsed = JsonSerializer.Deserialize<SoapNoteResponse>(clean,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (parsed == null || string.IsNullOrWhiteSpace(parsed.Assessment))
            {
                _logger.LogWarning("Parsed SOAP response missing required fields.");
                return null;
            }

            return new GeneratedSoapNote(
                Subjective: parsed.Subjective ?? string.Empty,
                Objective: parsed.Objective ?? string.Empty,
                Assessment: parsed.Assessment,
                Plan: parsed.Plan ?? string.Empty,
                ExtractedDiagnosisCodes: parsed.ExtractedDiagnosisCodes,
                ExtractedMedications: parsed.ExtractedMedications,
                FollowUpInstructions: parsed.FollowUpInstructions,
                ModelVersion: _options.Model,
                PromptTokens: 0); // overwritten by caller
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse SOAP note JSON response.");
            return null;
        }
    }

    private static string ExtractJson(string response)
    {
        var trimmed = response.Trim();
        if (trimmed.StartsWith("```"))
        {
            var start = trimmed.IndexOf('\n') + 1;
            var end = trimmed.LastIndexOf("```");
            return end > start ? trimmed[start..end].Trim() : trimmed;
        }
        return trimmed;
    }

    private static int EstimateTokens(string text) =>
        (int)Math.Ceiling(text.Length / 3.5); // rough approximation

    // ── Internal response models ──────────────────────────────────────────

    private class AnthropicMessagesResponse
    {
        [JsonPropertyName("content")]
        public List<ContentBlock>? Content { get; set; }
    }

    private class ContentBlock
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }

    private class SoapNoteResponse
    {
        [JsonPropertyName("subjective")]
        public string? Subjective { get; set; }

        [JsonPropertyName("objective")]
        public string? Objective { get; set; }

        [JsonPropertyName("assessment")]
        public string? Assessment { get; set; }

        [JsonPropertyName("plan")]
        public string? Plan { get; set; }

        [JsonPropertyName("extractedDiagnosisCodes")]
        public string? ExtractedDiagnosisCodes { get; set; }

        [JsonPropertyName("extractedMedications")]
        public string? ExtractedMedications { get; set; }

        [JsonPropertyName("followUpInstructions")]
        public string? FollowUpInstructions { get; set; }
    }
}
