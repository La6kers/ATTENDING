namespace ATTENDING.Contracts.Requests;

// Contracts project does not reference ATTENDING.Domain — no Domain types here.
// The API controller maps string → Domain enum before dispatching the MediatR command.

public record StartRecordingRequest(
    Guid EncounterId,
    Guid PatientId);

public record RecordConsentRequest(
    bool ConsentGiven,
    string CapturedBy);

public record AddTranscriptSegmentRequest(
    /// <summary>"Provider", "Patient", or "Other"</summary>
    string Speaker,
    int OffsetMs,
    int DurationMs,
    string Text,
    decimal Confidence = 0.9m);

public record EditNoteRequest(
    string Subjective,
    string Objective,
    string Assessment,
    string Plan);

public record SignNoteRequest(
    Guid ProviderId);
