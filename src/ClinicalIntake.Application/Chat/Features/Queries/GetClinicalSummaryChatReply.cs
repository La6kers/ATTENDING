using FluentResults;
using Microsoft.Extensions.DependencyInjection;
using SharedKernel;

namespace ClinicalIntake.Application.Chat.Features.Queries;
public static class GetClinicalSummaryChatReply
{
    public record Request(IEnumerable<ChatMessage> ChatMessages) : IRequest<Response>;
    public record Response(string ClinicalSummary);

    internal static IServiceCollection AddGetClinicalSummaryChatReplyFeature(this IServiceCollection services) =>
        services.AddScoped<IRequestHandler<Request, Response>, Handler>();

    private class Handler(IClinicalSummaryService clinicalSummaryService) : IRequestHandler<Request, Response>
    {
        private readonly IClinicalSummaryService _clinicalSummaryService = clinicalSummaryService;
        public async Task<Result<Response>> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                if(request.ChatMessages == null || !request.ChatMessages.Any())
                    return Result.Fail<Response>(new SharedKernel.Error(nameof(GetChatReply), "Chat messages cannot be empty."));

                var chatReply = await _clinicalSummaryService.GetClinicalSummary(request.ChatMessages, cancellationToken);
                var response = new Response(chatReply);
                return Result.Ok(response);
            }
            catch(Exception exception)
            {
                return Result.Fail<Response>(new SharedKernel.ExceptionalError(nameof(GetChatReply), exception))
                    .WithError("An error occurred while getting a clinical summary.");
            }
        }
    }
    internal interface IClinicalSummaryService
    {
        Task<string> GetClinicalSummary(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken);
    }
}
