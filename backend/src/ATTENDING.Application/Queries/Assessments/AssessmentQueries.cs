using MediatR;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Queries.Assessments;

public record GetAssessmentByIdQuery(Guid AssessmentId) : IRequest<PatientAssessment?>;
public record GetAssessmentsByPatientQuery(Guid PatientId) : IRequest<IReadOnlyList<PatientAssessment>>;
public record GetPendingReviewAssessmentsQuery() : IRequest<IReadOnlyList<PatientAssessment>>;
public record GetRedFlagAssessmentsQuery() : IRequest<IReadOnlyList<PatientAssessment>>;

public class GetAssessmentByIdHandler : IRequestHandler<GetAssessmentByIdQuery, PatientAssessment?>
{
    private readonly IAssessmentRepository _repository;
    public GetAssessmentByIdHandler(IAssessmentRepository repository) => _repository = repository;
    public async Task<PatientAssessment?> Handle(GetAssessmentByIdQuery request, CancellationToken ct)
        => await _repository.GetWithSymptomsAsync(request.AssessmentId, ct);
}

public class GetAssessmentsByPatientHandler : IRequestHandler<GetAssessmentsByPatientQuery, IReadOnlyList<PatientAssessment>>
{
    private readonly IAssessmentRepository _repository;
    public GetAssessmentsByPatientHandler(IAssessmentRepository repository) => _repository = repository;
    public async Task<IReadOnlyList<PatientAssessment>> Handle(GetAssessmentsByPatientQuery request, CancellationToken ct)
        => await _repository.GetByPatientIdAsync(request.PatientId, ct);
}

public class GetPendingReviewAssessmentsHandler : IRequestHandler<GetPendingReviewAssessmentsQuery, IReadOnlyList<PatientAssessment>>
{
    private readonly IAssessmentRepository _repository;
    public GetPendingReviewAssessmentsHandler(IAssessmentRepository repository) => _repository = repository;
    public async Task<IReadOnlyList<PatientAssessment>> Handle(GetPendingReviewAssessmentsQuery request, CancellationToken ct)
        => await _repository.GetPendingReviewAsync(ct);
}

public class GetRedFlagAssessmentsHandler : IRequestHandler<GetRedFlagAssessmentsQuery, IReadOnlyList<PatientAssessment>>
{
    private readonly IAssessmentRepository _repository;
    public GetRedFlagAssessmentsHandler(IAssessmentRepository repository) => _repository = repository;
    public async Task<IReadOnlyList<PatientAssessment>> Handle(GetRedFlagAssessmentsQuery request, CancellationToken ct)
        => await _repository.GetWithRedFlagsAsync(ct);
}
