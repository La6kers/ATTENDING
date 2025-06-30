using ClinicalIntake.Application.Chat;
using ClinicalIntake.Application.Chat.Features.Queries;
using FluentResults;
using Microsoft.AspNetCore.Mvc;
using SharedKernel;
using System.Runtime.CompilerServices;
using System.Text.Json;

namespace ClinicalIntake.API.Controllers;
[ApiController]
[Route("api/[controller]/[action]")]
public class ChatController(Mediator mediator) : Controller
{
    private readonly Mediator _mediator = mediator;

    [HttpPost()]
    public async IAsyncEnumerable<string> Send([FromBody] List<ChatMessage> messages, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        if(messages == null || !messages.Any())
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { Error = "Chat messages cannot be empty." }, cancellationToken);
            yield break;
        }

        var request = new GetGatherSymptomsChatReply.Request(messages);
        Result<GetGatherSymptomsChatReply.Response> response = await _mediator.Send<GetGatherSymptomsChatReply.Request, GetGatherSymptomsChatReply.Response>(request, cancellationToken);

        if(response.IsFailed)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await HttpContext.Response.WriteAsJsonAsync(new
            {
                Error = "An error occurred while processing the request.",
                Details = response.Errors.Select(e => e.Message)
            }, cancellationToken);
            yield break;
        }

        await foreach(var chunk in response.Value.StreamingChatReply.TextChunks.WithCancellation(cancellationToken))
            yield return chunk;

        var isComplete = await response.Value.StreamingChatReply.IsConversationComplete;
        Console.WriteLine($"Conversation complete: {isComplete}");

        if(await response.Value.StreamingChatReply.IsConversationComplete)
            yield return JsonSerializer.Serialize(new { IsComplete = true });
    }

    [HttpPost()]
    public async Task<IActionResult> GetQuickReplies([FromBody] List<ChatMessage> messages, CancellationToken cancellationToken)
    {
        if(messages == null || !messages.Any())
            return BadRequest("Chat messages cannot be empty.");

        var request = new GetQuickRepliesChatReply.Request(messages);
        Result<GetQuickRepliesChatReply.Response> result = await _mediator.Send<GetQuickRepliesChatReply.Request, GetQuickRepliesChatReply.Response>(request, cancellationToken);

        if(result.IsFailed)
            return StatusCode(500, result.Errors);

        return Ok(result.Value);
    }

    [HttpPost()]
    public async Task<IActionResult> GetClinicalSummary([FromBody] List<ChatMessage> messages, CancellationToken cancellationToken)
    {
        if(messages is null || !messages.Any())
            return BadRequest("Chat messages cannot be empty.");

        var request = new GetClinicalSummaryChatReply.Request(messages);
        Result<GetClinicalSummaryChatReply.Response> result = await _mediator.Send<GetClinicalSummaryChatReply.Request, GetClinicalSummaryChatReply.Response>(request, cancellationToken);
        if(result.IsFailed)
            return Problem(result.Errors.Select(e => e.Message).ToString(), statusCode: StatusCodes.Status500InternalServerError);

        return Ok(result.Value.ClinicalSummary);
    }
}