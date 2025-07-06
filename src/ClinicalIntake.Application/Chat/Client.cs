using SharedKernel;
using System.Net.Http.Json;
using System.Text.Json;
using static ClinicalIntake.Application.Chat.ClinicalIntakeChatService;

namespace ClinicalIntake.Application.Chat;
public class ClinicalIntakeChatClient(IHttpClientFactory httpClientFactory)
{
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;

    /// <summary>
    /// Sends a chat request to the server and appends the response to the provided ObservableStringBuilder.
    /// </summary>
    /// <param name="messages"></param>
    /// <param name="chatStage"></param>
    /// <param name="observableStringBuilder"></param>
    /// <param name="cancellationToken"></param>
    /// <returns> Returns true if the chat stage is complete, otherwise false.</returns>
    /// <exception cref="Exception"></exception>
    public async Task<bool> GetChatReply(IEnumerable<ChatMessage> messages, ChatStage chatStage, ObservableStringBuilder observableStringBuilder, CancellationToken cancellationToken)
    {
        using var client = _httpClientFactory.CreateClient("ClinicalIntakeChatClient");
        var response = await client.PostAsync("api/chat/send", JsonContent.Create(new ChatRequestDto(messages, chatStage)), cancellationToken);

        if(!response.IsSuccessStatusCode)
            throw new Exception("Failed to get chat reply from the server.");

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
                    observableStringBuilder.Append(textChunk);

                    if(textChunk.Contains(Constants.CHAT_STAGE_COMPLETED_MARKER))
                        return true;
                }
        }

        return false;
    }


}
