using FluentValidation;
using MediatR;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Application.Commands.AmbientScribe;

// ═══════════════════════════════════════════════════════════════════════════
// AMBIENT SCRIBE — Commands
//
// Clinical value: providers spend 35–40% of visit time on documentation.
// Ambient scribe eliminates this — the AI listens to the encounter, the
// provider reviews a ready SOAP note when it ends.
//
// Competing products: Abridge, Nabla, Nuance DAX ($100–250/provider/month).
// ATTENDING delivers this natively inside the platform.
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Create a new recording session for an encounter.
/// Consent is not yet given — the session sits in AwaitingConsent until
/// RecordConsentCommand fires.
/// </summary>
public record StartRecordingSessionCommand(
    Guid EncounterId,
    Guid PatientId,
    Guid ProviderId,
    Guid OrganizationId
) : IRequest<Result<StartRecordingSessionResult>>;

public record StartRecordingSessionResult(Guid RecordingId, string AudioBlobContainer);

public class StartRecordingSessionValidator : AbstractValidator<StartRecordingSessionCommand>
{
    public StartRecordingSessionValidator()
    {
        RuleFor(x => x.EncounterId).NotEmpty();
        RuleFor(x => x.PatientId).NotEmpty();
        RuleFor(x => x.ProviderId).NotEmpty();
        RuleFor(x => x.OrganizationId).NotEmpty();
    }
}

/// <summary>
/// Record patient consent (or decline) before audio capture starts.
/// HIPAA / state wiretapping law — recording cannot begin without this.
/// </summary>
public record RecordConsentCommand(
    Guid RecordingId,
    bool ConsentGiven,
    string CapturedBy
) : IRequest<Result<Unit>>;

public class RecordConsentValidator : AbstractValidator<RecordConsentCommand>
{
    public RecordConsentValidator()
    {
        RuleFor(x => x.RecordingId).NotEmpty();
        RuleFor(x => x.CapturedBy).NotEmpty().MaximumLength(200);
    }
}

/// <summary>
/// Append a real-time transcript segment from the Azure Speech SDK stream.
/// Called frequently during the encounter — one command per recognized phrase.
/// </summary>
public record AddTranscriptSegmentCommand(
    Guid RecordingId,
    Guid OrganizationId,
    SpeakerRole Speaker,
    int OffsetMs,
    int DurationMs,
    string Text,
    decimal Confidence
) : IRequest<Result<Guid>>;

public class AddTranscriptSegmentValidator : AbstractValidator<AddTranscriptSegmentCommand>
{
    public AddTranscriptSegmentValidator()
    {
        RuleFor(x => x.RecordingId).NotEmpty();
        RuleFor(x => x.Text).NotEmpty().MaximumLength(5_000);
        RuleFor(x => x.Confidence).InclusiveBetween(0m, 1m);
        RuleFor(x => x.OffsetMs).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DurationMs).GreaterThan(0);
    }
}

/// <summary>
/// Stop audio capture and trigger async AI note generation.
/// Status moves to Processing. The provider polls /status or receives
/// a SignalR push when the note is ready.
/// </summary>
public record StopRecordingCommand(Guid RecordingId) : IRequest<Result<Unit>>;

/// <summary>
/// Provider edits sections of the AI-generated SOAP note before signing.
/// Every call increments AmbientNote.EditCount for the audit trail.
/// </summary>
public record EditAmbientNoteCommand(
    Guid NoteId,
    Guid ProviderId,
    string Subjective,
    string Objective,
    string Assessment,
    string Plan
) : IRequest<Result<Unit>>;

public class EditAmbientNoteValidator : AbstractValidator<EditAmbientNoteCommand>
{
    public EditAmbientNoteValidator()
    {
        RuleFor(x => x.NoteId).NotEmpty();
        RuleFor(x => x.ProviderId).NotEmpty();
        RuleFor(x => x.Subjective).NotEmpty().MaximumLength(10_000);
        RuleFor(x => x.Objective).MaximumLength(10_000);
        RuleFor(x => x.Assessment).NotEmpty().MaximumLength(10_000);
        RuleFor(x => x.Plan).NotEmpty().MaximumLength(10_000);
    }
}

/// <summary>
/// Provider signs the reviewed note — it becomes part of the permanent medical record.
/// Signed notes cannot be edited; a new addendum would be a separate note.
/// </summary>
public record SignAmbientNoteCommand(
    Guid NoteId,
    Guid ProviderId
) : IRequest<Result<Unit>>;
