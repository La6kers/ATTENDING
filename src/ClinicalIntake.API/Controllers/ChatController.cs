using ClinicalIntake.Application.SubContext.Chat;
using ClinicalIntake.Application.SubContext.Chat.Features.Queries;
using FluentResults;
using Microsoft.AspNetCore.Mvc;
using SharedKernel;

namespace ClinicalIntake.API.Controllers;
[ApiController]
[Route("api/[controller]")]
public class ChatController(Mediator mediator) : Controller
{
    private readonly Mediator _mediator = mediator;

    [HttpGet("Send")]
    public async Task<IActionResult> Send([FromBody] List<ChatMessage> messages, CancellationToken cancellationToken)
    {
        if(messages == null || !messages.Any())
            return BadRequest("Chat messages cannot be empty.");

        var request = new GetGatherSymptomsChatReply.Request(messages);
        Result<GetGatherSymptomsChatReply.Response> result = await _mediator.Send<GetGatherSymptomsChatReply.Request, GetGatherSymptomsChatReply.Response>(request, cancellationToken);

        if(result.IsFailed)
            return StatusCode(500, result.Errors);

        return Ok(result.Value.StreamingChatReply);
    }
}