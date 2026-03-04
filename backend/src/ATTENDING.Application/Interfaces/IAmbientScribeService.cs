using ATTENDING.Domain.Entities;

namespace ATTENDING.Application.Interfaces;

/// <summary>
/// Abstraction for the ambient AI scribe — converts encounter transcripts
/// into structured SOAP notes using the configured LLM.
///
/// Implemented in Infrastructure (AnthropicAmbientScribeService).
/// The command handlers depend on this interface, not the concrete class.
///
/// Design principles:
///   • Audio is never stored permanently — blobs are deleted after transcription
///   • The transcript and generated note ARE retained as the medical record
///   • Prompt is capped to prevent unbounded token usage (see BuildNotePrompt)
///   • Model version is recorded on every note for audit and retraining purposes
/// </summary>
public interface IAmbientScribeService
{
    /// <summary>
    /// Generate a structured SOAP note from an ordered list of transcript segments.
    /// Returns null if the AI service is unavailable — caller handles fallback gracefully.
    /// </summary>
    Task<GeneratedSoapNote?> GenerateSoapNoteAsync(
        IReadOnlyList<TranscriptSegment> segments,
        SoapNoteContext context,
        CancellationToken ct = default);

    /// <summary>
    /// Quick availability check — used to decide whether to attempt generation.
    /// </summary>
    Task<bool> IsAvailableAsync(CancellationToken ct = default);
}

/// <summary>
/// Clinical context injected into the SOAP note prompt to improve accuracy.
/// The AI uses this to ground note generation in the known patient context.
/// </summary>
public record SoapNoteContext(
    string? ChiefComplaint,
    int? PatientAge,
    string? PatientSex,
    IReadOnlyList<string> ActiveConditions,
    IReadOnlyList<string> CurrentMedications,
    IReadOnlyList<string> Allergies,
    string? EncounterType
);

/// <summary>
/// The AI-generated SOAP note content before it is persisted to AmbientNote.
/// </summary>
public record GeneratedSoapNote(
    string Subjective,
    string Objective,
    string Assessment,
    string Plan,
    string? ExtractedDiagnosisCodes,
    string? ExtractedMedications,
    string? FollowUpInstructions,
    string ModelVersion,
    int PromptTokens
);
