using FluentResults;
using Microsoft.Extensions.DependencyInjection;
using SharedKernel;

namespace ClinicalIntake.Application.Features.Queries;
public static class GetGatherSymptomsChatReply
{
    public record Request(IEnumerable<string> Messages) : IRequest<Response>;
    public record Response(string Reply);

    internal static IServiceCollection AddGetGatherSymptomsChatReplyFeature(this IServiceCollection services) => services.AddScoped<IRequestHandler<Request, Response>, Handler>();

    private class Handler(IGetGatherSymptomsChatReplyService getGatherSymptomsChatReplyService) : IRequestHandler<Request, Response>
    {
        private readonly IGetGatherSymptomsChatReplyService _getGatherSymptomsChatReplyService = getGatherSymptomsChatReplyService;

        public async Task<Result<Response>> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                if(request.Messages == null || !request.Messages.Any())
                    return Result.Fail(new SharedKernel.ValidationError("Messages cannot be null or empty."));
                var chatResponse = string.Empty;


                return Result.Ok(new Response(chatResponse));
            }
            catch(Exception exception)
            {
                return Result.Fail(new SharedKernel.ExceptionalError(nameof(GetGatherSymptomsChatReply), exception))
                    .WithError("An error occurred while getting a chat reply.");
            }
        }
    }

    internal interface IGetGatherSymptomsChatReplyService
    {
        IAsyncEnumerable<string> GetChatReply(IEnumerable<string> messages, CancellationToken cancellationToken);
    }
}