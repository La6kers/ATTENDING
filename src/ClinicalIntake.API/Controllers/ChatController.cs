using Microsoft.AspNetCore.Mvc;

namespace ClinicalIntake.API.Controllers;
public class ChatController : Controller
{
    public async Task<SendResponse> Send(IEnumerable<string> messages)
    {
        var response = new SendResponse(
            Reply: "",
            QuickReplies: new[] { "" },
            ClinicalSummary: ""
        );

        return await Task.FromResult(response);
    }

    public record SendResponse(string Reply, IEnumerable<string> QuickReplies, string ClinicalSummary);
}
