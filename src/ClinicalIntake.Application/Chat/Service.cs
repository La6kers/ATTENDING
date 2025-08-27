using ClinicalIntake.Application.Chat.Features.Events;
using ClinicalIntake.Application.Chat.Features.Queries;
using FluentResults;
using SharedKernel;

namespace ClinicalIntake.Application.Chat;
public class ClinicalIntakeChatService(Mediator mediator)
{
    private readonly Mediator _mediator = mediator;

    public async Task<IAsyncEnumerable<string>> GetChatReply(IEnumerable<ChatMessage> chatMessages, CancellationToken cancellationToken)
    {
        if(chatMessages is null || !chatMessages.Any())
            throw new ArgumentException("Chat messages cannot be empty.", nameof(chatMessages));

        var request = new GetChatReply.Request(chatMessages);
        Result<GetChatReply.Response> response = await _mediator.Send<GetChatReply.Request, GetChatReply.Response>(request, cancellationToken);

        if(response.IsFailed)
            throw new ArgumentException("An error occurred while processing the request.", nameof(chatMessages));

        return response.Value.StreamingChatReply;
    }
    public async Task<Result<IEnumerable<string>>> GetQuickReplies(IEnumerable<ChatMessage> chatMessages, CancellationToken cancellationToken)
    {
        if(chatMessages is null || !chatMessages.Any())
            throw new ArgumentException("Chat messages cannot be empty.", nameof(chatMessages));

        var request = new GetQuickRepliesChatReply.Request(chatMessages);
        Result<GetQuickRepliesChatReply.Response> result = await _mediator.Send<GetQuickRepliesChatReply.Request, GetQuickRepliesChatReply.Response>(request, cancellationToken);
        if(result.IsFailed)
            return Result.Fail<IEnumerable<string>>("An error occurred while getting quick replies.");

        return Result.Ok(result.Value.QuickReplies)
            .WithReasons(result.Reasons);
    }
    public async Task<Result<string>> GetClinicalSummary(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken)
    {
        if(messages is null || !messages.Any())
            return Result.Fail<string>("Chat messages cannot be empty.");

        var request = new GetClinicalSummaryChatReply.Request(messages);
        Result<GetClinicalSummaryChatReply.Response> response = await _mediator.Send<GetClinicalSummaryChatReply.Request, GetClinicalSummaryChatReply.Response>(request, cancellationToken);
        if(response.IsFailed)
            return Result.Fail<string>("An error occurred while getting the clinical summary.");

        return Result.Ok(response.Value.ClinicalSummary)
            .WithReasons(response.Reasons);
    }
    public async Task<Result> TriggerEventChatSurveyCompleted(ChatSurvey chatSurvey, CancellationToken cancellationToken = default)
    {
        if(chatSurvey is null)
            return Result.Fail("Chat survey cannot be null.");
        var request = new ChatSurveyCompleted.Request(chatSurvey);
        Result result = await _mediator.Send<ChatSurveyCompleted.Request>(request, cancellationToken);
        if(result.IsFailed)
            return Result.Fail("An error occurred while saving the chat survey.");
        return Result.Ok()
            .WithReasons(result.Reasons);
    }
}
