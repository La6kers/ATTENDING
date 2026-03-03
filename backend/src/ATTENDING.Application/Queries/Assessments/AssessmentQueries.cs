using MediatR;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Application.Queries.Assessments;

public record GetAssessmentByIdQuery(Guid AssessmentId) : IRequest<PatientAssessment?>;
public record GetAssessmentsByPatientQuery(Guid PatientId) : IRequest<IReadOnlyList<PatientAssessment>>;
public record GetPendingReviewAssessmentsQuery() : IRequest<IReadOnlyList<PatientAssessment>>;
public record GetRedFlagAssessmentsQuery() : IRequest<IReadOnlyList<PatientAssessment>>;

public record GetAssessmentsListQuery(
    string? Status = null,
    string? TriageLevel = null,
    bool? HasRedFlags = null,
    int Page = 1,
    int PageSize = 50
) : IRequest<(IReadOnlyList<PatientAssessment> Items, int TotalCount)>;

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

public class GetAssessmentsListHandler : IRequestHandler<GetAssessmentsListQuery, (IReadOnlyList<PatientAssessment> Items, int TotalCount)>
{
    private readonly IAssessmentRepository _repository;
    public GetAssessmentsListHandler(IAssessmentRepository repository) => _repository = repository;
    public async Task<(IReadOnlyList<PatientAssessment> Items, int TotalCount)> Handle(
        GetAssessmentsListQuery request, CancellationToken ct)
    {
        var skip = (request.Page - 1) * request.PageSize;
        return await _repository.GetFilteredAsync(
            request.Status, request.TriageLevel, request.HasRedFlags, skip, request.PageSize, ct);
    }
}
