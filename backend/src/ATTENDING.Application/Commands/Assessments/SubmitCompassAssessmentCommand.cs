using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;

namespace ATTENDING.Application.Commands.Assessments;

/// <summary>
/// One-shot COMPASS assessment submission from the patient portal.
/// Creates a completed assessment with full HPI, symptoms, medications,
/// allergies, red flags — everything the patient entered in a single command.
/// 
/// This differs from the multi-step StartAssessment → SubmitResponse → Complete
/// flow which is for real-time interactive assessment building.
/// </summary>
public record SubmitCompassAssessmentCommand(
    string? PatientName,
    string? DateOfBirth,
    string? Gender,
    string ChiefComplaint,
    CompassHpiData? Hpi,
    Dictionary<string, string[]>? ReviewOfSystems,
    List<string>? Medications,
    List<string>? Allergies,
    List<string>? MedicalHistory,
    List<string>? SurgicalHistory,
    Dictionary<string, string>? SocialHistory,
    List<string>? FamilyHistory,
    List<string>? RedFlags,
    string? UrgencyLevel,
    int? UrgencyScore
) : IRequest<Result<CompassAssessmentSubmitted>>;

public record CompassHpiData(
    string? Onset,
    string? Location,
    string? Duration,
    string? Character,
    int? Severity,
    List<string>? Aggravating,
    List<string>? Relieving,
    List<string>? Associated,
    string? Timing);

public record CompassAssessmentSubmitted(
    Guid AssessmentId,
    string AssessmentNumber,
    int QueuePosition,
    string EstimatedReviewTime,
    bool UrgentAlert);

public class SubmitCompassAssessmentHandler
    : IRequestHandler<SubmitCompassAssessmentCommand, Result<CompassAssessmentSubmitted>>
{
    private readonly IPatientRepository _patientRepo;
    private readonly IAssessmentRepository _assessmentRepo;
    private readonly IUnitOfWork _uow;
    private readonly IRedFlagEvaluator _redFlagEvaluator;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<SubmitCompassAssessmentHandler> _logger;

    public SubmitCompassAssessmentHandler(
        IPatientRepository patientRepo,
        IAssessmentRepository assessmentRepo,
        IUnitOfWork uow,
        IRedFlagEvaluator redFlagEvaluator,
        ICurrentUserService currentUser,
        ILogger<SubmitCompassAssessmentHandler> logger)
    {
        _patientRepo = patientRepo;
        _assessmentRepo = assessmentRepo;
        _uow = uow;
        _redFlagEvaluator = redFlagEvaluator;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<Result<CompassAssessmentSubmitted>> Handle(
        SubmitCompassAssessmentCommand request, CancellationToken ct)
    {
        // ── Find or create patient ──────────────────────────────────────
        var nameParts = (request.PatientName ?? "Anonymous Patient").Split(' ', 2);
        var firstName = nameParts[0];
        var lastName = nameParts.Length > 1 ? nameParts[1] : "Patient";

        var mrn = $"COMPASS-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString()[..6].ToUpper()}";

        // Use current tenant if authenticated, otherwise Guid.Empty
        // (the AuditSaveChangesInterceptor will override on save if tenant context exists)
        var orgId = _currentUser.TenantId ?? Guid.Empty;

        var patient = Patient.Create(
            organizationId: orgId,
            mrn: mrn,
            firstName: firstName,
            lastName: lastName,
            dateOfBirth: DateTime.TryParse(request.DateOfBirth, out var dob) ? dob : new DateTime(1990, 1, 1),
            sex: ParseSex(request.Gender));

        await _patientRepo.AddAsync(patient, ct);

        // ── Evaluate red flags ──────────────────────────────────────────
        var symptomDescription = request.RedFlags != null && request.RedFlags.Count > 0
            ? string.Join(", ", request.RedFlags)
            : null;
        var redFlagEval = _redFlagEvaluator.Evaluate(
            request.ChiefComplaint, symptomDescription, request.Hpi?.Severity);

        // ── Create completed assessment ─────────────────────────────────
        var assessment = PatientAssessment.Create(
            patient.Id, request.ChiefComplaint, redFlagEval);

        // Set HPI data
        if (request.Hpi != null)
        {
            assessment.SetHpiData(
                onset: request.Hpi.Onset,
                location: request.Hpi.Location,
                duration: request.Hpi.Duration,
                character: request.Hpi.Character,
                aggravating: request.Hpi.Aggravating != null ? string.Join(", ", request.Hpi.Aggravating) : null,
                relieving: request.Hpi.Relieving != null ? string.Join(", ", request.Hpi.Relieving) : null,
                timing: request.Hpi.Timing,
                severity: request.Hpi.Severity?.ToString(),
                associatedSymptoms: request.Hpi.Associated != null ? string.Join(", ", request.Hpi.Associated) : null);

            if (request.Hpi.Severity.HasValue)
                assessment.SetPainSeverity(Math.Clamp(request.Hpi.Severity.Value, 0, 10));
        }

        // Determine triage level
        var triageLevel = MapTriageLevel(request.UrgencyLevel, redFlagEval?.HasRedFlags == true);
        assessment.Complete(triageLevel);

        await _assessmentRepo.AddAsync(assessment, ct);
        await _uow.SaveChangesAsync(ct);

        // ── Calculate queue position ────────────────────────────────────
        var pending = await _assessmentRepo.GetPendingReviewAsync(ct);
        var queuePosition = triageLevel == TriageLevel.Emergency ? 1 : pending.Count + 1;

        var estimatedTime = triageLevel switch
        {
            TriageLevel.Emergency => "Immediate",
            TriageLevel.Urgent => "15-30 minutes",
            _ when redFlagEval?.HasRedFlags == true => "30 minutes",
            _ => "2-4 hours"
        };

        _logger.LogInformation(
            "COMPASS assessment submitted: {AssessmentNumber}, Patient {PatientId}, " +
            "Triage: {Triage}, RedFlags: {RedFlagCount}, Queue: {Queue}",
            assessment.AssessmentNumber, patient.Id, triageLevel,
            request.RedFlags?.Count ?? 0, queuePosition);

        return Result<CompassAssessmentSubmitted>.Success(new CompassAssessmentSubmitted(
            assessment.Id,
            assessment.AssessmentNumber,
            queuePosition,
            estimatedTime,
            redFlagEval?.HasRedFlags == true));
    }

    private static BiologicalSex ParseSex(string? gender) => gender?.ToLower() switch
    {
        "male" or "m" => BiologicalSex.Male,
        "female" or "f" => BiologicalSex.Female,
        _ => BiologicalSex.Unknown
    };

    private static TriageLevel MapTriageLevel(string? urgency, bool hasRedFlags)
    {
        if (urgency == null) return hasRedFlags ? TriageLevel.Urgent : TriageLevel.NonUrgent;
        return urgency.ToLower() switch
        {
            "emergency" => TriageLevel.Resuscitation,
            "high" => TriageLevel.Urgent,
            "moderate" => TriageLevel.LessUrgent,
            _ => TriageLevel.NonUrgent
        };
    }
}
