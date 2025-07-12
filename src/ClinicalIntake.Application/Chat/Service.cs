using ClinicalIntake.Application.Chat.Features.Queries;
using FluentResults;
using SharedKernel;

namespace ClinicalIntake.Application.Chat;
public class ClinicalIntakeChatService(Mediator mediator)
{
    private readonly Mediator _mediator = mediator;

    public async Task<Result<IAsyncEnumerable<string>>> GetChatReply(IEnumerable<ChatMessage> messages, ChatStage chatStage, CancellationToken cancellationToken)
    {
        if(messages is null || !messages.Any())
            return Result.Fail<IAsyncEnumerable<string>>("Chat messages cannot be empty.");

        var request = new GetChatReply.Request(messages, chatStage);
        Result<GetChatReply.Response> response = await _mediator.Send<GetChatReply.Request, GetChatReply.Response>(request, cancellationToken);

        if(response.IsFailed)
            return Result.Fail<IAsyncEnumerable<string>>("An error occurred while processing the request.");

        return Result.Ok(response.Value.StreamingChatReply);
    }

    public async Task<Result<IEnumerable<string>>> GetQuickReplies(IEnumerable<ChatMessage> chatMessages, CancellationToken cancellationToken)
    {
        var request = new GetQuickRepliesChatReply.Request(chatMessages);
        Result<GetQuickRepliesChatReply.Response> result = await _mediator.Send<GetQuickRepliesChatReply.Request, GetQuickRepliesChatReply.Response>(request, cancellationToken);
        if(result.IsFailed)
            return Result.Fail<IEnumerable<string>>("An error occurred while getting quick replies.");

        return Result.Ok(result.Value.QuickReplies);
    }

    public async Task<Result<string>> GetClinicalSummary(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken)
    {
        if(messages is null || !messages.Any())
            return Result.Fail<string>("Chat messages cannot be empty.");

        var request = new GetClinicalSummaryChatReply.Request(messages);
        Result<GetClinicalSummaryChatReply.Response> response = await _mediator.Send<GetClinicalSummaryChatReply.Request, GetClinicalSummaryChatReply.Response>(request, cancellationToken);
        if(response.IsFailed)
            return Result.Fail<string>("An error occurred while getting the clinical summary.");

        return Result.Ok(response.Value.ClinicalSummary);
    }

    public record GetChatReplyRequestDto(IEnumerable<ChatMessage> Messages, ChatStage ChatStage);
}
