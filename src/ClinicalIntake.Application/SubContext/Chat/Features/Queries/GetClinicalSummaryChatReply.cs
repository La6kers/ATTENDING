using FluentResults;
using Microsoft.Extensions.DependencyInjection;
using SharedKernel;

namespace ClinicalIntake.Application.SubContext.Chat.Features.Queries;
public static class GetClinicalSummaryChatReply
{
    public record Request(IEnumerable<ChatMessage> ChatMessages) : IRequest<Response>;
    public record Response(IAsyncEnumerable<string> ClinicalSummary);

    internal static IServiceCollection AddGetClinicalSummaryChatReplyFeature(this IServiceCollection services) =>
        services.AddScoped<IRequestHandler<Request, Response>, Handler>();

    private class Handler(IClinicalSummaryService clinicalSummaryService) : IRequestHandler<Request, Response>
    {
        private readonly IClinicalSummaryService _clinicalSummaryService = clinicalSummaryService;
        public Task<Result<Response>> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                if(request.ChatMessages == null || !request.ChatMessages.Any())
                    return Task.FromResult(Result.Fail<Response>(new SharedKernel.Error(nameof(GetGatherSymptomsChatReply), "Chat messages cannot be empty.")));

                var chatReply = _clinicalSummaryService.GetClinicalSummary(request.ChatMessages, cancellationToken);
                var response = new Response(chatReply);
                var result = Result.Ok(response);
                return Task.FromResult(result);
            }
            catch(Exception exception)
            {
                return Task.FromResult(Result.Fail<Response>(new SharedKernel.ExceptionalError(nameof(GetGatherSymptomsChatReply), exception))
                    .WithError("An error occurred while getting a clinical summary."));
            }
        }
    }
    internal interface IClinicalSummaryService
    {
        IAsyncEnumerable<string> GetClinicalSummary(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken);
    }
}
