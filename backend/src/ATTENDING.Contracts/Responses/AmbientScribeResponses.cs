namespace ATTENDING.Contracts.Responses;

public record StartRecordingResponse(
    Guid RecordingId,
    string AudioBlobContainer,
    string Status);

public record RecordingStatusResponse(
    Guid RecordingId,
    Guid EncounterId,
    string Status,
    bool ConsentGiven,
    DateTime? RecordingStartedAt,
    DateTime? RecordingEndedAt,
    int TotalAudioSeconds,
    bool NoteReady,
    Guid? NoteId);

public record TranscriptSegmentResponse(
    Guid SegmentId,
    string Speaker,
    int OffsetMs,
    int DurationMs,
    string Text,
    decimal Confidence,
    bool WasEdited);

public record AmbientNoteResponse(
    Guid NoteId,
    Guid EncounterId,
    string Status,
    string Subjective,
    string Objective,
    string Assessment,
    string Plan,
    string? ExtractedDiagnosisCodes,
    string? ExtractedMedications,
    string? FollowUpInstructions,
    string ModelVersion,
    int EditCount,
    DateTime GeneratedAt,
    DateTime? SignedAt,
    Guid? SignedByProviderId);
