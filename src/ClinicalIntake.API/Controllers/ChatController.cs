using ClinicalIntake.Application.Chat;
using Microsoft.AspNetCore.Mvc;
using System.Runtime.CompilerServices;

namespace ClinicalIntake.API.Controllers;
[ApiController]
[Route("api/[controller]/[action]")]
public class ChatController(ClinicalIntakeChatService clinicalIntakeChatService) : Controller
{
    private readonly ClinicalIntakeChatService _clinicalIntakeChatService = clinicalIntakeChatService;

    [HttpPost()]
    public async IAsyncEnumerable<string> GetChatReply([FromBody] IEnumerable<ChatMessage> messages, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        if(messages is null || !messages.Any())
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { Error = "Chat messages cannot be empty." }, cancellationToken);
            yield break;
        }

        var getChatReplyStream = await _clinicalIntakeChatService.GetChatReply(messages, cancellationToken);
        if(getChatReplyStream is null)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await HttpContext.Response.WriteAsJsonAsync(new { Error = "An error occurred while processing the chat reply." }, cancellationToken);
            yield break;
        }

        await foreach(var chunk in getChatReplyStream.WithCancellation(cancellationToken))
        {
            if(!string.IsNullOrEmpty(chunk))
                yield return chunk;
        }
    }

    [HttpPost()]
    public async Task<IActionResult> GetQuickReplies([FromBody] IEnumerable<ChatMessage> messages, CancellationToken cancellationToken)
    {
        if(messages == null || !messages.Any())
            return BadRequest("Chat messages cannot be empty.");

        var getQuickRepliesResult = await _clinicalIntakeChatService.GetQuickReplies(messages, cancellationToken);
        if(getQuickRepliesResult.IsFailed)
            return Problem(getQuickRepliesResult.Errors.Select(e => e.Message).ToString(), statusCode: StatusCodes.Status500InternalServerError);

        return Ok(getQuickRepliesResult.Value);
    }

    [HttpPost()]
    public async Task<IActionResult> GetClinicalSummary([FromBody] IEnumerable<ChatMessage> messages, CancellationToken cancellationToken)
    {
        if(messages is null || !messages.Any())
            return BadRequest("Chat messages cannot be empty.");

        var getClinicalSummaryResult = await _clinicalIntakeChatService.GetClinicalSummary(messages, cancellationToken);
        if(getClinicalSummaryResult.IsFailed)
            return Problem(getClinicalSummaryResult.Errors.Select(e => e.Message).ToString(), statusCode: StatusCodes.Status500InternalServerError);

        return Ok(getClinicalSummaryResult.Value);
    }
}