using FluentResults;
using SharedKernel;

namespace ClinicalIntake.Application.Features.Queries;
public static class GetClinicalSummaryChatReply
{
    public record Request(string PatientId) : IRequest<Response>;
    public record Response(string Summary);
    private class Handler(IClinicalSummaryService clinicalSummaryService) : IRequestHandler<Request, Response>
    {
        private readonly IClinicalSummaryService _clinicalSummaryService = clinicalSummaryService;
        public async Task<Result<Response>> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                var summary = await _clinicalSummaryService.GetClinicalSummary(request.PatientId, cancellationToken);
                return Result.Ok(new Response(summary));
            }
            catch(Exception exception)
            {
                return Result.Fail(new SharedKernel.ExceptionalError(nameof(GetClinicalSummaryChatReply), exception))
                    .WithError("An error occurred while getting the clinical summary.");
            }
        }
    }
    internal interface IClinicalSummaryService
    {
        Task<string> GetClinicalSummary(string patientId, CancellationToken cancellationToken);
    }
}
