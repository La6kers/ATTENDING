using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;

namespace ATTENDING.Application.Commands.Assessments;

public class StartAssessmentHandler : IRequestHandler<StartAssessmentCommand, StartAssessmentResult>
{
    private readonly IAssessmentRepository _assessmentRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IRedFlagEvaluator _redFlagEvaluator;
    private readonly IAuditService _auditService;
    private readonly ILogger<StartAssessmentHandler> _logger;

    public StartAssessmentHandler(
        IAssessmentRepository assessmentRepository,
        IPatientRepository patientRepository,
        IUnitOfWork unitOfWork,
        IRedFlagEvaluator redFlagEvaluator,
        IAuditService auditService,
        ILogger<StartAssessmentHandler> logger)
    {
        _assessmentRepository = assessmentRepository;
        _patientRepository = patientRepository;
        _unitOfWork = unitOfWork;
        _redFlagEvaluator = redFlagEvaluator;
        _auditService = auditService;
        _logger = logger;
    }

    public async Task<StartAssessmentResult> Handle(
        StartAssessmentCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var patient = await _patientRepository.GetByIdAsync(request.PatientId, cancellationToken);
            if (patient == null)
                return new StartAssessmentResult(false, null, null, false, null, false,
                    $"Patient not found: {request.PatientId}");

            var redFlagEvaluation = _redFlagEvaluator.Evaluate(request.ChiefComplaint, null, null);

            var assessment = PatientAssessment.Create(
                patientId: request.PatientId,
                chiefComplaint: request.ChiefComplaint,
                redFlagEvaluation: redFlagEvaluation);

            await _assessmentRepository.AddAsync(assessment, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            await _auditService.LogPhiAccessAsync(
                userId: request.PatientId, patientId: request.PatientId,
                action: "START_ASSESSMENT", resourceType: "PatientAssessment",
                resourceId: assessment.Id,
                details: $"Started assessment: {request.ChiefComplaint}",
                cancellationToken: cancellationToken);

            _logger.LogInformation(
                "Assessment started: {AssessmentNumber} for Patient {PatientId}",
                assessment.AssessmentNumber, request.PatientId);

            return new StartAssessmentResult(true, assessment.Id, assessment.AssessmentNumber,
                assessment.IsEmergency, assessment.EmergencyReason, assessment.HasRedFlags, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start assessment for Patient {PatientId}", request.PatientId);
            return new StartAssessmentResult(false, null, null, false, null, false, ex.Message);
        }
    }
}

public class SubmitAssessmentResponseHandler
    : IRequestHandler<SubmitAssessmentResponseCommand, SubmitAssessmentResponseResult>
{
    private readonly IAssessmentRepository _assessmentRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IRedFlagEvaluator _redFlagEvaluator;
    private readonly ILogger<SubmitAssessmentResponseHandler> _logger;

    public SubmitAssessmentResponseHandler(
        IAssessmentRepository assessmentRepository, IUnitOfWork unitOfWork,
        IRedFlagEvaluator redFlagEvaluator, ILogger<SubmitAssessmentResponseHandler> logger)
    {
        _assessmentRepository = assessmentRepository;
        _unitOfWork = unitOfWork;
        _redFlagEvaluator = redFlagEvaluator;
        _logger = logger;
    }

    public async Task<SubmitAssessmentResponseResult> Handle(
        SubmitAssessmentResponseCommand request, CancellationToken cancellationToken)
    {
        var assessment = await _assessmentRepository.GetWithSymptomsAsync(request.AssessmentId, cancellationToken);
        if (assessment == null)
            return new SubmitAssessmentResponseResult(false, false, false, null,
                $"Assessment not found: {request.AssessmentId}");

        var combinedText = $"{assessment.ChiefComplaint} {request.Response}";
        var redFlagEvaluation = _redFlagEvaluator.Evaluate(combinedText, null, assessment.PainSeverity);

        assessment.AddResponse(request.Question, request.Response, redFlagEvaluation);
        _assessmentRepository.Update(assessment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (redFlagEvaluation.HasRedFlags)
            _logger.LogWarning("Red flags in assessment {Num}: {Cat}",
                assessment.AssessmentNumber,
                string.Join(", ", redFlagEvaluation.RedFlags.Select(f => f.Category)));

        return new SubmitAssessmentResponseResult(true, redFlagEvaluation.HasRedFlags,
            assessment.IsEmergency, assessment.EmergencyReason, null);
    }
}

public class AdvanceAssessmentPhaseHandler
    : IRequestHandler<AdvanceAssessmentPhaseCommand, AdvanceAssessmentPhaseResult>
{
    private readonly IAssessmentRepository _assessmentRepository;
    private readonly IUnitOfWork _unitOfWork;

    public AdvanceAssessmentPhaseHandler(IAssessmentRepository assessmentRepository, IUnitOfWork unitOfWork)
    { _assessmentRepository = assessmentRepository; _unitOfWork = unitOfWork; }

    public async Task<AdvanceAssessmentPhaseResult> Handle(
        AdvanceAssessmentPhaseCommand request, CancellationToken cancellationToken)
    {
        var assessment = await _assessmentRepository.GetWithSymptomsAsync(request.AssessmentId, cancellationToken);
        if (assessment == null)
            return new AdvanceAssessmentPhaseResult(false, $"Assessment not found: {request.AssessmentId}");

        assessment.AdvanceToPhase(request.NewPhase);
        _assessmentRepository.Update(assessment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new AdvanceAssessmentPhaseResult(true, null);
    }
}

public class CompleteAssessmentHandler
    : IRequestHandler<CompleteAssessmentCommand, CompleteAssessmentResult>
{
    private readonly IAssessmentRepository _assessmentRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CompleteAssessmentHandler> _logger;

    public CompleteAssessmentHandler(IAssessmentRepository assessmentRepository,
        IUnitOfWork unitOfWork, ILogger<CompleteAssessmentHandler> logger)
    { _assessmentRepository = assessmentRepository; _unitOfWork = unitOfWork; _logger = logger; }

    public async Task<CompleteAssessmentResult> Handle(
        CompleteAssessmentCommand request, CancellationToken cancellationToken)
    {
        var assessment = await _assessmentRepository.GetWithSymptomsAsync(request.AssessmentId, cancellationToken);
        if (assessment == null)
            return new CompleteAssessmentResult(false, $"Assessment not found: {request.AssessmentId}");

        assessment.Complete(request.TriageLevel, request.Summary);
        _assessmentRepository.Update(assessment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Assessment completed: {Num}, Triage: {T}",
            assessment.AssessmentNumber, request.TriageLevel);
        return new CompleteAssessmentResult(true, null);
    }
}

public class ReviewAssessmentHandler
    : IRequestHandler<ReviewAssessmentCommand, ReviewAssessmentResult>
{
    private readonly IAssessmentRepository _assessmentRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public ReviewAssessmentHandler(IAssessmentRepository assessmentRepository,
        IUnitOfWork unitOfWork, IAuditService auditService)
    { _assessmentRepository = assessmentRepository; _unitOfWork = unitOfWork; _auditService = auditService; }

    public async Task<ReviewAssessmentResult> Handle(
        ReviewAssessmentCommand request, CancellationToken cancellationToken)
    {
        var assessment = await _assessmentRepository.GetByIdAsync(request.AssessmentId, cancellationToken);
        if (assessment == null)
            return new ReviewAssessmentResult(false, $"Assessment not found: {request.AssessmentId}");

        assessment.MarkAsReviewed(request.ProviderId, request.Notes);
        _assessmentRepository.Update(assessment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogPhiAccessAsync(
            userId: request.ProviderId, patientId: assessment.PatientId,
            action: "REVIEW_ASSESSMENT", resourceType: "PatientAssessment",
            resourceId: assessment.Id, details: "Provider reviewed patient assessment",
            cancellationToken: cancellationToken);
        return new ReviewAssessmentResult(true, null);
    }
}
