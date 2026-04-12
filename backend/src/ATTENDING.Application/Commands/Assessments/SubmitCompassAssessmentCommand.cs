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
/// Creates (or finds) a patient and a completed assessment in a single command.
///
/// Organization context: The caller MUST supply a ClinicSlug that resolves to a known
/// Organization. This scopes the assessment to the correct tenant so providers can
/// see it in their filtered dashboard queue.
///
/// Patient deduplication: Before creating a new Patient record, the handler checks
/// for an existing patient matching first name + last name + date of birth within
/// the resolved organization. If found, the existing patient ID is reused to avoid
/// creating disconnected parallel histories.
///
/// This differs from the multi-step StartAssessment -> SubmitResponse -> Complete
/// flow which is for real-time interactive assessment building.
/// </summary>
public record SubmitCompassAssessmentCommand(
    /// <summary>
    /// URL slug of the clinic (e.g., "valley-rural-health"). Resolved to Organization.Id.
    /// Required so anonymous COMPASS submissions are scoped to the correct tenant.
    /// </summary>
    string? ClinicSlug,
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
    private readonly IOrganizationRepository _orgRepo;
    private readonly IUnitOfWork _uow;
    private readonly IRedFlagEvaluator _redFlagEvaluator;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<SubmitCompassAssessmentHandler> _logger;

    public SubmitCompassAssessmentHandler(
        IPatientRepository patientRepo,
        IAssessmentRepository assessmentRepo,
        IOrganizationRepository orgRepo,
        IUnitOfWork uow,
        IRedFlagEvaluator redFlagEvaluator,
        ICurrentUserService currentUser,
        ILogger<SubmitCompassAssessmentHandler> logger)
    {
        _patientRepo = patientRepo;
        _assessmentRepo = assessmentRepo;
        _orgRepo = orgRepo;
        _uow = uow;
        _redFlagEvaluator = redFlagEvaluator;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<Result<CompassAssessmentSubmitted>> Handle(
        SubmitCompassAssessmentCommand request, CancellationToken ct)
    {
        // ── Resolve organization ───────────────────────────────────────
        // Priority 1: authenticated provider's tenant (portal-initiated)
        // Priority 2: ClinicSlug from the COMPASS intake URL (anonymous patient)
        // Priority 3: no valid org => reject with a clear error rather than
        //             silently writing records with OrganizationId = Guid.Empty
        //             which would be invisible in every provider's filtered queue.
        Guid orgId;

        if (_currentUser.TenantId.HasValue && _currentUser.TenantId.Value != Guid.Empty)
        {
            orgId = _currentUser.TenantId.Value;
        }
        else if (!string.IsNullOrWhiteSpace(request.ClinicSlug))
        {
            var org = await _orgRepo.GetBySlugAsync(request.ClinicSlug.Trim().ToLowerInvariant(), ct);
            if (org == null)
            {
                _logger.LogWarning(
                    "COMPASS submission rejected: unknown clinic slug '{Slug}'", request.ClinicSlug);
                return Result.Failure<CompassAssessmentSubmitted>(
                    new Error("Organization.NotFound",
                        $"Clinic '{request.ClinicSlug}' was not found. " +
                        "Please use the link provided by your clinic."));
            }
            orgId = org.Id;
        }
        else
        {
            _logger.LogWarning(
                "COMPASS submission rejected: no ClinicSlug and no authenticated tenant.");
            return Result.Failure<CompassAssessmentSubmitted>(
                new Error("Organization.Required",
                    "A clinic identifier is required to submit an assessment. " +
                    "Please use the link provided by your clinic."));
        }

        // ── Parse patient demographics ──────────────────────────────────
        var nameParts = (request.PatientName ?? "Anonymous Patient").Split(' ', 2);
        var firstName = nameParts[0].Trim();
        var lastName = (nameParts.Length > 1 ? nameParts[1] : "Patient").Trim();

        // Attempt to parse date of birth. Log a warning rather than silently
        // defaulting to a sentinel value that could be used in dosing calculations.
        DateTime? parsedDob = null;
        if (!string.IsNullOrWhiteSpace(request.DateOfBirth))
        {
            if (DateTime.TryParse(request.DateOfBirth, out var dob))
            {
                parsedDob = dob.ToUniversalTime().Date;
            }
            else
            {
                _logger.LogWarning(
                    "COMPASS submission: could not parse DateOfBirth '{Raw}' for patient {First} {Last}",
                    request.DateOfBirth, firstName, lastName);
            }
        }

        // Use explicit DOB if provided; otherwise a clearly-invalid sentinel
        // (Jan 1 1900) that will trigger data-quality follow-up, not a plausible
        // default that could silently pass clinical validation.
        var effectiveDob = parsedDob ?? new DateTime(1900, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var dobIsUnknown = parsedDob == null;

        // ── Patient deduplication ──────────────────────────────────────
        // Check for an existing patient with the same name + DOB in this org
        // before creating a new record. Without this, every COMPASS submission
        // creates a new Patient row, fragmenting clinical history across records.
        Patient? patient = null;

        if (!dobIsUnknown)
        {
            patient = await _patientRepo.FindByNameAndDobAsync(
                firstName, lastName, effectiveDob, orgId, ct);

            if (patient != null)
            {
                _logger.LogInformation(
                    "COMPASS: matched existing patient {PatientId} for {First} {Last} DOB {Dob:d}",
                    patient.Id, firstName, lastName, effectiveDob);
            }
        }

        if (patient == null)
        {
            var mrn = $"COMPASS-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString()[..6].ToUpper()}";
            patient = Patient.Create(
                organizationId: orgId,
                mrn: mrn,
                firstName: firstName,
                lastName: lastName,
                dateOfBirth: effectiveDob,
                sex: ParseSex(request.Gender));

            await _patientRepo.AddAsync(patient, ct);

            _logger.LogInformation(
                "COMPASS: created new patient {PatientId} MRN={Mrn} for {First} {Last}",
                patient.Id, mrn, firstName, lastName);
        }

        // ── Evaluate red flags ─────────────────────────────────────────
        var symptomDescription = request.RedFlags?.Count > 0
            ? string.Join(", ", request.RedFlags)
            : null;
        var redFlagEval = _redFlagEvaluator.Evaluate(
            request.ChiefComplaint, symptomDescription, request.Hpi?.Severity);

        // ── Create completed assessment ────────────────────────────────
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
                aggravating: request.Hpi.Aggravating != null
                    ? string.Join(", ", request.Hpi.Aggravating) : null,
                relieving: request.Hpi.Relieving != null
                    ? string.Join(", ", request.Hpi.Relieving) : null,
                timing: request.Hpi.Timing,
                severity: request.Hpi.Severity?.ToString(),
                associatedSymptoms: request.Hpi.Associated != null
                    ? string.Join(", ", request.Hpi.Associated) : null);

            if (request.Hpi.Severity.HasValue)
                assessment.SetPainSeverity(Math.Clamp(request.Hpi.Severity.Value, 0, 10));
        }

        // Persist all patient-reported clinical data.
        // These fields were previously discarded -- providers need this information
        // to review the assessment and make clinical decisions.
        if (request.Medications?.Count > 0)
            assessment.SetMedicationsJson(System.Text.Json.JsonSerializer.Serialize(request.Medications));

        if (request.Allergies?.Count > 0)
            assessment.SetAllergiesJson(System.Text.Json.JsonSerializer.Serialize(request.Allergies));

        var historyPayload = BuildHistoryJson(
            request.MedicalHistory, request.SurgicalHistory,
            request.FamilyHistory, request.SocialHistory);
        if (historyPayload != null)
            assessment.SetMedicalHistoryJson(historyPayload);

        if (request.ReviewOfSystems?.Count > 0)
            assessment.SetReviewOfSystemsJson(
                System.Text.Json.JsonSerializer.Serialize(request.ReviewOfSystems));

        // Determine triage level and complete
        var triageLevel = MapTriageLevel(request.UrgencyLevel, redFlagEval?.HasRedFlags == true);
        assessment.Complete(triageLevel);

        await _assessmentRepo.AddAsync(assessment, ct);
        await _uow.SaveChangesAsync(ct);

        // ── Calculate queue position via COUNT(*) -- not full materialization ──
        var pendingCount = await _assessmentRepo.GetPendingReviewCountAsync(ct);
        var queuePosition = triageLevel is TriageLevel.Resuscitation or TriageLevel.Emergent
            ? 1
            : pendingCount;

        var estimatedTime = triageLevel switch
        {
            TriageLevel.Resuscitation => "Immediate",
            TriageLevel.Emergent => "Immediate",
            TriageLevel.Urgent => "15-30 minutes",
            _ when redFlagEval?.HasRedFlags == true => "30 minutes",
            _ => "2-4 hours"
        };

        _logger.LogInformation(
            "COMPASS assessment submitted: {AssessmentNumber}, Patient {PatientId} " +
            "(existing={WasExisting}, dobUnknown={DobUnknown}), " +
            "Triage: {Triage}, RedFlags: {RedFlagCount}, Queue: {Queue}, Org: {OrgId}",
            assessment.AssessmentNumber, patient.Id,
            /* WasExisting */ patient.CreatedAt < DateTime.UtcNow.AddSeconds(-2),
            dobIsUnknown, triageLevel,
            request.RedFlags?.Count ?? 0, queuePosition, orgId);

        return Result<CompassAssessmentSubmitted>.Success(new CompassAssessmentSubmitted(
            assessment.Id,
            assessment.AssessmentNumber,
            queuePosition,
            estimatedTime,
            redFlagEval?.HasRedFlags == true));
    }

    private static string? BuildHistoryJson(
        List<string>? medical, List<string>? surgical,
        List<string>? family, Dictionary<string, string>? social)
    {
        if ((medical == null || medical.Count == 0) &&
            (surgical == null || surgical.Count == 0) &&
            (family == null || family.Count == 0) &&
            (social == null || social.Count == 0))
        {
            return null;
        }

        return System.Text.Json.JsonSerializer.Serialize(new
        {
            medical  = medical  ?? new List<string>(),
            surgical = surgical ?? new List<string>(),
            family   = family   ?? new List<string>(),
            social   = social   ?? new Dictionary<string, string>()
        });
    }

    private static BiologicalSex ParseSex(string? gender) => gender?.ToLower() switch
    {
        "male"   or "m" => BiologicalSex.Male,
        "female" or "f" => BiologicalSex.Female,
        _               => BiologicalSex.Unknown
    };

    private static TriageLevel MapTriageLevel(string? urgency, bool hasRedFlags)
    {
        if (urgency == null) return hasRedFlags ? TriageLevel.Urgent : TriageLevel.NonUrgent;
        return urgency.ToLower() switch
        {
            "emergency" => TriageLevel.Resuscitation,
            "high"      => TriageLevel.Urgent,
            "moderate"  => TriageLevel.LessUrgent,
            _           => TriageLevel.NonUrgent
        };
    }
}
