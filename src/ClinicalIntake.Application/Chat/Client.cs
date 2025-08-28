using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text.Json;

namespace ClinicalIntake.Application.Chat;
public class ClinicalIntakeChatClient(IHttpClientFactory httpClientFactory)
{
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;

    /// <summary>
    /// Sends a chat request to the server and appends the response to the provided ObservableStringBuilder.
    /// </summary>
    /// <param name="messages"></param>
    /// <param name="currentChatStage"></param>
    /// <param name="observableStringBuilder"></param>
    /// <param name="cancellationToken"></param>
    /// <returns> Returns true if the chat stage is complete, otherwise false.</returns>
    /// <exception cref="Exception"></exception>
    public async IAsyncEnumerable<string> GetChatReply(IEnumerable<ChatMessage> messages, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if(messages == null || !messages.Any())
            throw new ArgumentException("Messages cannot be null or empty.", nameof(messages));

        using var client = _httpClientFactory.CreateClient("ClinicalIntakeChatClient");
        var response = await client.PostAsync("api/chat/getChatReply", JsonContent.Create(messages), cancellationToken);

        if(!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new Exception($"Failed to get chat reply from the server. Status Code: {response.StatusCode}, Content: {errorContent}");
        }

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        while(!reader.EndOfStream)
        {
            var textChunksJson = await reader.ReadLineAsync(cancellationToken);
            if(string.IsNullOrEmpty(textChunksJson))
                continue;

            var textChunks = JsonSerializer.Deserialize<IEnumerable<string?>>(textChunksJson) ?? [];
            foreach(var chunk in textChunks)
            {
                if(!string.IsNullOrEmpty(chunk))
                    yield return chunk;
            }
        }
    }
    public async Task<IEnumerable<string>> GetQuickReplies(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken = default)
    {
        using var client = _httpClientFactory.CreateClient("ClinicalIntakeChatClient");
        var response = await client.PostAsJsonAsync("api/chat/getQuickReplies", messages, cancellationToken);
        if(!response.IsSuccessStatusCode)
            throw new Exception("Failed to get quick replies from the server.");

        return await response.Content.ReadFromJsonAsync<List<string>>(cancellationToken: cancellationToken) ?? [];
    }
    public async Task<string> GetClinicalSummary(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken = default)
    {
        using var client = _httpClientFactory.CreateClient("ClinicalIntakeChatClient");
        var response = await client.PostAsJsonAsync("api/chat/getClinicalSummary", messages, cancellationToken);
        if(!response.IsSuccessStatusCode)
            throw new Exception("Failed to get clinical summary from the server.");

        return await response.Content.ReadAsStringAsync(cancellationToken);
    }
    public async Task TriggerEventChatSurveyCompleted(ChatSurvey chatSurvey, CancellationToken cancellationToken = default)
    {
        if(chatSurvey == null)
            throw new ArgumentNullException(nameof(chatSurvey), "Chat survey cannot be null.");
        using var client = _httpClientFactory.CreateClient("ClinicalIntakeChatClient");
        var response = await client.PostAsJsonAsync("api/chat/triggerEventChatSurveyCompleted", chatSurvey, cancellationToken);
        if(!response.IsSuccessStatusCode)
            throw new Exception("Failed to trigger event 'Chat Survey Completed'.");
    }
}
