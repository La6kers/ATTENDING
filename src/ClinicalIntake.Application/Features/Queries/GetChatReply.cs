using FluentResults;
using SharedKernel;

namespace ClinicalIntake.Application.Features.Queries;

public static class GetChatReply
{
    public record Request(IEnumerable<string> Messages) : IRequest<Response>;
    public record Response(string Message, IEnumerable<string> QuickChatReplies);

    private class Handler(IGetChatReplyService getChatReplyService) : IRequestHandler<Request, Response>
    {
        private readonly IGetChatReplyService _getChatReplyService = getChatReplyService;

        public async Task<Result<Response>> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                var chatResponse = await _getChatReplyService.GetChatReply(request.Messages, cancellationToken);
                return Result.Ok(chatResponse);
            }
            catch(Exception exception)
            {
                return Result.Fail(new SharedKernel.ExceptionalError(nameof(GetChatReply), exception))
                    .WithError("An error occurred while getting a chat reply.");
            }
        }
    }

    internal interface IGetChatReplyService
    {
        Task<Response> GetChatReply(IEnumerable<string> messages, CancellationToken cancellationToken);
    }
}