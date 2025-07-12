using ClinicalIntake.Application.Chat;
using Microsoft.AspNetCore.Mvc;
using System.Runtime.CompilerServices;
using static ClinicalIntake.Application.Chat.ClinicalIntakeChatService;

namespace ClinicalIntake.API.Controllers;
[ApiController]
[Route("api/[controller]/[action]")]
public class ChatController(ClinicalIntakeChatService clinicalIntakeChatService) : Controller
{
    private readonly ClinicalIntakeChatService _clinicalIntakeChatService = clinicalIntakeChatService;

    [HttpPost()]
    public async IAsyncEnumerable<string> GetChatReply([FromBody] GetChatReplyRequestDto getChatReplyRequestDto, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        if(getChatReplyRequestDto?.Messages == null || !getChatReplyRequestDto.Messages.Any())
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { Error = "Chat messages cannot be empty." }, cancellationToken);
            yield break;
        }

        var getChatReplyResult = await _clinicalIntakeChatService.GetChatReply(getChatReplyRequestDto.Messages, getChatReplyRequestDto.ChatStage, cancellationToken);
        if(getChatReplyResult.IsFailed)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await HttpContext.Response.WriteAsJsonAsync(new { Error = getChatReplyResult.Errors.Select(e => e.Message) }, cancellationToken);
            yield break;
        }

        await foreach(var chunk in getChatReplyResult.Value.WithCancellation(cancellationToken))
        {
            if(string.IsNullOrEmpty(chunk))
                continue;

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