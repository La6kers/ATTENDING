using SharedKernel;
using System.Net.Http.Json;
using System.Text.Json;
using static ClinicalIntake.Application.Chat.ClinicalIntakeChatService;

namespace ClinicalIntake.Application.Chat;
public class ClinicalIntakeChatClient(Mediator mediator, IHttpClientFactory httpClientFactory)
{
    private readonly Mediator _mediator = mediator;
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;

    public async IAsyncEnumerable<string> GetChatReply(IEnumerable<ChatMessage> messages, ChatStage chatStage, CancellationToken cancellationToken)
    {
        using var client = _httpClientFactory.CreateClient("ClinicalIntakeChatClient");
        var response = await client.PostAsync("api/chat/send", JsonContent.Create(new ChatRequestDto(messages, chatStage)), cancellationToken);

        if(!response.IsSuccessStatusCode)
            throw new Exception("Failed to get chat reply from the server.");

        bool isChatStageCompleted = false;

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);
        while(!reader.EndOfStream)
        {
            var textChunksJson = await reader.ReadLineAsync(cancellationToken);
            if(string.IsNullOrEmpty(textChunksJson))
                continue;

            var textChunks = JsonSerializer.Deserialize<List<string?>>(textChunksJson) ?? [];
            foreach(var textChunk in textChunks)
                if(!string.IsNullOrEmpty(textChunk))
                {
                    if(textChunk.Contains(Constants.CHAT_STAGE_COMPLETED_MARKER))
                    {
                        isChatStageCompleted = true;
                        yield return textChunk.Replace(Constants.CHAT_STAGE_COMPLETED_MARKER, string.Empty);
                        break;
                    }
                    yield return textChunk;
                }
        }
    }


}
