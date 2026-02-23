using MediatR;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;

namespace ATTENDING.Application.Commands.Assessments;

public class StartAssessmentHandler : IRequestHandler<StartAssessmentCommand, Result<AssessmentStarted>>
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

    public async Task<Result<AssessmentStarted>> Handle(
        StartAssessmentCommand request, CancellationToken cancellationToken)
    {
        var patient = await _patientRepository.GetByIdAsync(request.PatientId, cancellationToken);
        if (patient == null)
            return Result.Failure<AssessmentStarted>(DomainErrors.Patient.NotFound(request.PatientId));

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

        _logger.LogInformation("Assessment started: {AssessmentNumber} for Patient {PatientId}",
            assessment.AssessmentNumber, request.PatientId);

        return new AssessmentStarted(assessment.Id, assessment.AssessmentNumber,
            assessment.IsEmergency, assessment.EmergencyReason, assessment.HasRedFlags);
    }
}

public class SubmitAssessmentResponseHandler
    : IRequestHandler<SubmitAssessmentResponseCommand, Result<AssessmentResponseSubmitted>>
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

    public async Task<Result<AssessmentResponseSubmitted>> Handle(
        SubmitAssessmentResponseCommand request, CancellationToken cancellationToken)
    {
        var assessment = await _assessmentRepository.GetWithSymptomsAsync(request.AssessmentId, cancellationToken);
        if (assessment == null)
            return Result.Failure<AssessmentResponseSubmitted>(
                DomainErrors.Assessment.NotFound(request.AssessmentId));

        if (assessment.CurrentPhase == Domain.Enums.AssessmentPhase.Completed)
            return Result.Failure<AssessmentResponseSubmitted>(DomainErrors.Assessment.AlreadyCompleted);

        var combinedText = $"{assessment.ChiefComplaint} {request.Response}";
        var redFlagEvaluation = _redFlagEvaluator.Evaluate(combinedText, null, assessment.PainSeverity);

        assessment.AddResponse(request.Question, request.Response, redFlagEvaluation);
        _assessmentRepository.Update(assessment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (redFlagEvaluation.HasRedFlags)
            _logger.LogWarning("Red flags in assessment {Num}: {Cat}",
                assessment.AssessmentNumber,
                string.Join(", ", redFlagEvaluation.RedFlags.Select(f => f.Category)));

        return new AssessmentResponseSubmitted(redFlagEvaluation.HasRedFlags,
            assessment.IsEmergency, assessment.EmergencyReason);
    }
}

public class AdvanceAssessmentPhaseHandler
    : IRequestHandler<AdvanceAssessmentPhaseCommand, Result<Unit>>
{
    private readonly IAssessmentRepository _assessmentRepository;
    private readonly IUnitOfWork _unitOfWork;

    public AdvanceAssessmentPhaseHandler(IAssessmentRepository assessmentRepository, IUnitOfWork unitOfWork)
    { _assessmentRepository = assessmentRepository; _unitOfWork = unitOfWork; }

    public async Task<Result<Unit>> Handle(
        AdvanceAssessmentPhaseCommand request, CancellationToken cancellationToken)
    {
        var assessment = await _assessmentRepository.GetWithSymptomsAsync(request.AssessmentId, cancellationToken);
        if (assessment == null)
            return Result.Failure<Unit>(DomainErrors.Assessment.NotFound(request.AssessmentId));

        if (assessment.CurrentPhase == Domain.Enums.AssessmentPhase.Completed)
            return Result.Failure<Unit>(DomainErrors.Assessment.AlreadyCompleted);

        assessment.AdvanceToPhase(request.NewPhase);
        _assessmentRepository.Update(assessment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success(Unit.Value);
    }
}

public class CompleteAssessmentHandler
    : IRequestHandler<CompleteAssessmentCommand, Result<Unit>>
{
    private readonly IAssessmentRepository _assessmentRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CompleteAssessmentHandler> _logger;

    public CompleteAssessmentHandler(IAssessmentRepository assessmentRepository,
        IUnitOfWork unitOfWork, ILogger<CompleteAssessmentHandler> logger)
    { _assessmentRepository = assessmentRepository; _unitOfWork = unitOfWork; _logger = logger; }

    public async Task<Result<Unit>> Handle(
        CompleteAssessmentCommand request, CancellationToken cancellationToken)
    {
        var assessment = await _assessmentRepository.GetWithSymptomsAsync(request.AssessmentId, cancellationToken);
        if (assessment == null)
            return Result.Failure<Unit>(DomainErrors.Assessment.NotFound(request.AssessmentId));

        if (assessment.CurrentPhase == Domain.Enums.AssessmentPhase.Completed)
            return Result.Failure<Unit>(DomainErrors.Assessment.AlreadyCompleted);

        assessment.Complete(request.TriageLevel, request.Summary);
        _assessmentRepository.Update(assessment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Assessment completed: {Num}, Triage: {T}",
            assessment.AssessmentNumber, request.TriageLevel);
        return Result.Success(Unit.Value);
    }
}

public class ReviewAssessmentHandler
    : IRequestHandler<ReviewAssessmentCommand, Result<Unit>>
{
    private readonly IAssessmentRepository _assessmentRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public ReviewAssessmentHandler(IAssessmentRepository assessmentRepository,
        IUnitOfWork unitOfWork, IAuditService auditService)
    { _assessmentRepository = assessmentRepository; _unitOfWork = unitOfWork; _auditService = auditService; }

    public async Task<Result<Unit>> Handle(
        ReviewAssessmentCommand request, CancellationToken cancellationToken)
    {
        var assessment = await _assessmentRepository.GetByIdAsync(request.AssessmentId, cancellationToken);
        if (assessment == null)
            return Result.Failure<Unit>(DomainErrors.Assessment.NotFound(request.AssessmentId));

        assessment.MarkAsReviewed(request.ProviderId, request.Notes);
        _assessmentRepository.Update(assessment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogPhiAccessAsync(
            userId: request.ProviderId, patientId: assessment.PatientId,
            action: "REVIEW_ASSESSMENT", resourceType: "PatientAssessment",
            resourceId: assessment.Id, details: "Provider reviewed patient assessment",
            cancellationToken: cancellationToken);
        return Result.Success(Unit.Value);
    }
}
