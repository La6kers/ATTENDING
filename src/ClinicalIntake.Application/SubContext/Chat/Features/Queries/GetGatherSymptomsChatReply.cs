using FluentResults;
using Microsoft.Extensions.DependencyInjection;
using SharedKernel;
using Error = SharedKernel.Error;

namespace ClinicalIntake.Application.SubContext.Chat.Features.Queries;
public static class GetGatherSymptomsChatReply
{
    public record Request(IEnumerable<ChatMessage> ChatMessages) : IRequest<Response>;
    public record Response(StreamingChatReply StreamingChatReply);

    internal static IServiceCollection AddGetGatherSymptomsChatReplyFeature(this IServiceCollection services) => services.AddScoped<IRequestHandler<Request, Response>, Handler>();

    private class Handler(IChatService chatService) : IRequestHandler<Request, Response>
    {
        private readonly IChatService _chatService = chatService;

        public Task<Result<Response>> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                if(request.ChatMessages == null || !request.ChatMessages.Any())
                    return Task.FromResult(Result.Fail<Response>(new Error(nameof(GetGatherSymptomsChatReply), "Chat messages cannot be empty.")));

                var chatReply = _chatService.GetReply(request.ChatMessages, cancellationToken);
                var response = new Response(chatReply);
                var result = Result.Ok(response);
                return Task.FromResult(result);
            }
            catch(Exception exception)
            {
                return Task.FromResult(Result.Fail<Response>(new SharedKernel.ExceptionalError(nameof(GetGatherSymptomsChatReply), exception))
                    .WithError("An error occurred while getting a chat reply."));
            }
        }
    }

    internal interface IChatService
    {
        StreamingChatReply GetReply(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken);
    }
}