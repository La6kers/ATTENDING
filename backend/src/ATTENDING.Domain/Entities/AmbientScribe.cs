using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;

namespace ATTENDING.Domain.Entities;

// ═══════════════════════════════════════════════════════════════════════════
// AMBIENT AI SCRIBE — Domain Entities
//
// Clinical value proposition: Providers spend 35–40% of clinical time on
// documentation. Ambient scribe eliminates this — the provider talks to the
// patient, the AI listens, and a structured SOAP note is ready for review
// when the encounter ends. Competing products (Abridge, Nabla, Nuance DAX)
// charge $100–$250/provider/month. ATTENDING delivers this natively.
//
// Consent is non-negotiable: recording cannot start without patient consent.
// Audio is never stored permanently — blobs are deleted after note generation.
// The transcript and generated note ARE retained as part of the medical record.
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// The encounter recording session. One session per encounter.
/// Aggregate root — owns TranscriptSegments and the generated AmbientNote.
///
/// State machine:
///   AwaitingConsent → ConsentGiven → Recording → Processing → Completed
///                                                            → Failed
///                   → ConsentDeclined (terminal, no recording)
/// </summary>
public class EncounterRecording : BaseEntity, IAggregateRoot, IHasDomainEvents
{
    public Guid Id { get; private set; }
    public Guid EncounterId { get; private set; }
    public Guid PatientId { get; private set; }
    public Guid ProviderId { get; private set; }

    public RecordingStatus Status { get; private set; }

    /// <summary>UTC when recording microphone opened</summary>
    public DateTime? RecordingStartedAt { get; private set; }

    /// <summary>UTC when recording microphone closed</summary>
    public DateTime? RecordingEndedAt { get; private set; }

    /// <summary>Total audio duration in seconds (accumulated across pause/resume cycles)</summary>
    public int TotalAudioSeconds { get; private set; }

    /// <summary>
    /// Azure Blob container for this session's audio chunks.
    /// Deleted automatically after note is generated (audio not retained).
    /// </summary>
    public string? AudioBlobContainer { get; private set; }

    /// <summary>Whether patient gave verbal or written consent</summary>
    public bool ConsentGiven { get; private set; }

    /// <summary>UTC when consent was captured</summary>
    public DateTime? ConsentTimestamp { get; private set; }

    /// <summary>IP/device that captured consent (audit trail)</summary>
    public string? ConsentCapturedBy { get; private set; }

    /// <summary>Human-readable reason if processing failed</summary>
    public string? FailureReason { get; private set; }

    /// <summary>Azure Speech cognitive services region used for this session</summary>
    public string? SpeechServiceRegion { get; private set; }

    // Navigation
    public virtual ICollection<TranscriptSegment> Segments { get; private set; } = new List<TranscriptSegment>();
    public virtual AmbientNote? GeneratedNote { get; private set; }
    public virtual Encounter? Encounter { get; private set; }

    private readonly List<DomainEvent> _domainEvents = new();
    public IReadOnlyCollection<DomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    public void ClearDomainEvents() => _domainEvents.Clear();

    private EncounterRecording() { }

    // ── Factory ───────────────────────────────────────────────────────────

    public static EncounterRecording Create(
        Guid encounterId,
        Guid patientId,
        Guid providerId,
        Guid organizationId,
        string? speechRegion = null)
    {
        var session = new EncounterRecording
        {
            Id = Guid.NewGuid(),
            EncounterId = encounterId,
            PatientId = patientId,
            ProviderId = providerId,
            Status = RecordingStatus.AwaitingConsent,
            SpeechServiceRegion = speechRegion ?? "eastus",
            AudioBlobContainer = $"scribe-{Guid.NewGuid():N}"
        };
        session.SetOrganization(organizationId);
        session._domainEvents.Add(new RecordingSessionCreated(session.Id, encounterId, patientId));
        return session;
    }

    // ── State transitions ─────────────────────────────────────────────────

    public void RecordConsent(string capturedBy)
    {
        if (Status != RecordingStatus.AwaitingConsent)
            throw new InvalidOperationException($"Cannot record consent in state {Status}.");

        ConsentGiven = true;
        ConsentTimestamp = DateTime.UtcNow;
        ConsentCapturedBy = capturedBy;
        Status = RecordingStatus.ConsentGiven;
        SetModified(capturedBy);
    }

    public void DeclineConsent(string capturedBy)
    {
        if (Status != RecordingStatus.AwaitingConsent)
            throw new InvalidOperationException($"Cannot decline consent in state {Status}.");

        ConsentGiven = false;
        Status = RecordingStatus.ConsentDeclined;
        SetModified(capturedBy);
    }

    public void StartRecording()
    {
        if (Status != RecordingStatus.ConsentGiven)
            throw new InvalidOperationException("Consent must be given before recording.");

        Status = RecordingStatus.Recording;
        RecordingStartedAt = DateTime.UtcNow;
        SetModified();
    }

    public void StopRecording()
    {
        if (Status != RecordingStatus.Recording)
            throw new InvalidOperationException($"Cannot stop recording in state {Status}.");

        Status = RecordingStatus.Processing;
        RecordingEndedAt = DateTime.UtcNow;

        if (RecordingStartedAt.HasValue)
            TotalAudioSeconds += (int)(RecordingEndedAt.Value - RecordingStartedAt.Value).TotalSeconds;

        SetModified();
        _domainEvents.Add(new RecordingSessionCompleted(Id, EncounterId, PatientId, TotalAudioSeconds));
    }

    public void MarkNoteGenerated()
    {
        Status = RecordingStatus.Completed;
        // Blob container reference retained for admin audit; actual blobs deleted by background job
        SetModified();
        _domainEvents.Add(new AmbientNoteGenerated(Id, EncounterId, PatientId));
    }

    public void MarkFailed(string reason)
    {
        Status = RecordingStatus.Failed;
        FailureReason = reason;
        SetModified();
    }

    public void AddAudioSeconds(int seconds)
    {
        TotalAudioSeconds += seconds;
    }
}

/// <summary>
/// A single diarized speech segment from the recording.
/// Each segment has a speaker label (Provider vs Patient) and a timestamp.
/// These are assembled into the full transcript for note generation.
/// </summary>
public class TranscriptSegment : BaseEntity
{
    public Guid Id { get; private set; }
    public Guid RecordingId { get; private set; }

    /// <summary>Speaker role identified by Azure diarization</summary>
    public SpeakerRole Speaker { get; private set; }

    /// <summary>Optional: provider-assigned speaker name</summary>
    public string? SpeakerLabel { get; private set; }

    /// <summary>Milliseconds from recording start</summary>
    public int OffsetMs { get; private set; }

    /// <summary>Duration of this segment in milliseconds</summary>
    public int DurationMs { get; private set; }

    /// <summary>Transcribed text (may include [inaudible] markers)</summary>
    public string Text { get; private set; } = string.Empty;

    /// <summary>Azure Speech confidence score 0.0–1.0</summary>
    public decimal Confidence { get; private set; }

    /// <summary>Whether this segment was manually edited by the provider</summary>
    public bool WasEdited { get; private set; }

    public virtual EncounterRecording? Recording { get; private set; }

    private TranscriptSegment() { }

    public static TranscriptSegment Create(
        Guid recordingId,
        Guid organizationId,
        SpeakerRole speaker,
        int offsetMs,
        int durationMs,
        string text,
        decimal confidence)
    {
        var seg = new TranscriptSegment
        {
            Id = Guid.NewGuid(),
            RecordingId = recordingId,
            Speaker = speaker,
            OffsetMs = offsetMs,
            DurationMs = durationMs,
            Text = text,
            Confidence = confidence
        };
        seg.SetOrganization(organizationId);
        return seg;
    }

    public void Edit(string newText, string editorId)
    {
        Text = newText;
        WasEdited = true;
        SetModified(editorId);
    }

    public void AssignSpeakerLabel(string label) => SpeakerLabel = label;
}

/// <summary>
/// The AI-generated SOAP note produced from the transcript.
/// The provider reviews, edits, and then signs — at which point the note
/// becomes part of the permanent medical record.
///
/// The full transcript is stored so the provider (and auditors) can always
/// trace every AI-generated sentence back to what was actually said.
/// </summary>
public class AmbientNote : BaseEntity
{
    public Guid Id { get; private set; }
    public Guid RecordingId { get; private set; }
    public Guid EncounterId { get; private set; }

    public NoteStatus Status { get; private set; }

    // ── SOAP sections ─────────────────────────────────────────────────────
    public string Subjective { get; private set; } = string.Empty;
    public string Objective { get; private set; } = string.Empty;
    public string Assessment { get; private set; } = string.Empty;
    public string Plan { get; private set; } = string.Empty;

    // ── Optional structured extractions ──────────────────────────────────
    /// <summary>ICD-10 codes the AI extracted from the assessment section</summary>
    public string? ExtractedDiagnosisCodes { get; private set; }

    /// <summary>Medications mentioned in the plan section</summary>
    public string? ExtractedMedications { get; private set; }

    /// <summary>Follow-up instructions mentioned in the plan</summary>
    public string? FollowUpInstructions { get; private set; }

    // ── Audit ─────────────────────────────────────────────────────────────
    /// <summary>UTC when note generation completed</summary>
    public DateTime GeneratedAt { get; private set; }

    /// <summary>AI model + version used for generation</summary>
    public string ModelVersion { get; private set; } = string.Empty;

    /// <summary>Token count of transcript input (for cost tracking)</summary>
    public int PromptTokens { get; private set; }

    /// <summary>UTC when provider signed the note</summary>
    public DateTime? SignedAt { get; private set; }

    /// <summary>Provider who signed</summary>
    public Guid? SignedByProviderId { get; private set; }

    /// <summary>Number of edits made before signing</summary>
    public int EditCount { get; private set; }

    public virtual EncounterRecording? Recording { get; private set; }

    private AmbientNote() { }

    public static AmbientNote Create(
        Guid recordingId,
        Guid encounterId,
        Guid organizationId,
        string subjective,
        string objective,
        string assessment,
        string plan,
        string modelVersion,
        int promptTokens,
        string? diagnosisCodes = null,
        string? medications = null,
        string? followUp = null)
    {
        var note = new AmbientNote
        {
            Id = Guid.NewGuid(),
            RecordingId = recordingId,
            EncounterId = encounterId,
            Status = NoteStatus.Draft,
            Subjective = subjective,
            Objective = objective,
            Assessment = assessment,
            Plan = plan,
            ModelVersion = modelVersion,
            PromptTokens = promptTokens,
            ExtractedDiagnosisCodes = diagnosisCodes,
            ExtractedMedications = medications,
            FollowUpInstructions = followUp,
            GeneratedAt = DateTime.UtcNow
        };
        note.SetOrganization(organizationId);
        return note;
    }

    public void Edit(
        string subjective,
        string objective,
        string assessment,
        string plan,
        string editorId)
    {
        if (Status == NoteStatus.Signed)
            throw new InvalidOperationException("Signed notes cannot be edited.");

        Subjective = subjective;
        Objective = objective;
        Assessment = assessment;
        Plan = plan;
        EditCount++;
        Status = NoteStatus.Edited;
        SetModified(editorId);
    }

    public void Sign(Guid providerId)
    {
        if (Status == NoteStatus.Signed)
            throw new InvalidOperationException("Note is already signed.");

        Status = NoteStatus.Signed;
        SignedAt = DateTime.UtcNow;
        SignedByProviderId = providerId;
        SetModified(providerId.ToString());
    }
}
