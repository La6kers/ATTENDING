using ClinicalIntake.Application.Chat.Features.Queries;
using FluentResults;
using SharedKernel;

namespace ClinicalIntake.Application.Chat;
public class ClinicalIntakeChatService(Mediator mediator)
{
    private readonly Mediator _mediator = mediator;

    public async Task<Result<IAsyncEnumerable<string>>> Chat(ChatRequestDto chatRequest, CancellationToken cancellationToken)
    {
        if(chatRequest?.Messages == null || !chatRequest.Messages.Any())
            return Result.Fail<IAsyncEnumerable<string>>("Chat messages cannot be empty.");

        var request = new GetChatReply.Request(chatRequest.Messages, chatRequest.ChatStage);
        Result<GetChatReply.Response> response = await _mediator.Send<GetChatReply.Request, GetChatReply.Response>(request, cancellationToken);

        if(response.IsFailed)
            return Result.Fail<IAsyncEnumerable<string>>("An error occurred while processing the request.");

        return Result.Ok(response.Value.StreamingChatReply.Stream);
    }

    public record ChatRequestDto(IEnumerable<ChatMessage> Messages, ChatStage ChatStage);
    public record ChatResponseDto(IAsyncEnumerable<string> ReplyStream);
}
