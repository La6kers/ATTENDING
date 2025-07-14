using FluentResults;
using Microsoft.Extensions.DependencyInjection;
using SharedKernel;
using Error = SharedKernel.Error;

namespace ClinicalIntake.Application.Chat.Features.Queries;
internal static class GetChatReply
{
    internal record Request(IEnumerable<ChatMessage> ChatMessages) : IRequest<Response>;
    internal record Response(IAsyncEnumerable<string> StreamingChatReply);

    internal static IServiceCollection AddGetChatReplyFeature(this IServiceCollection services) => services.AddScoped<IRequestHandler<Request, Response>, Handler>();

    private class Handler(IChatService chatService) : IRequestHandler<Request, Response>
    {
        private readonly IChatService _chatService = chatService;

        public Task<Result<Response>> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                if(request.ChatMessages == null || !request.ChatMessages.Any())
                    return Task.FromResult(Result.Fail<Response>(new Error(nameof(GetChatReply), "Chat messages cannot be empty.")));

                var chatReply = _chatService.GetReply(request.ChatMessages, cancellationToken);
                var response = new Response(chatReply);
                var result = Result.Ok(response);
                return Task.FromResult(result);
            }
            catch(Exception exception)
            {
                return Task.FromResult(Result.Fail<Response>(new SharedKernel.ExceptionalError(nameof(GetChatReply), exception))
                    .WithError("An error occurred while getting a chat reply."));
            }
        }
    }

    internal interface IChatService
    {
        IAsyncEnumerable<string> GetReply(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken);
    }
}