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
    /// <param name="currentChatStage"></param>
    /// <param name="observableStringBuilder"></param>
    /// <param name="cancellationToken"></param>
    /// <returns> Returns true if the chat stage is complete, otherwise false.</returns>
    /// <exception cref="Exception"></exception>
    public async Task<bool> GetChatReply(IEnumerable<ChatMessage> messages, ChatStage currentChatStage, ObservableStringBuilder observableStringBuilder, CancellationToken cancellationToken = default)
    {
        using var client = _httpClientFactory.CreateClient("ClinicalIntakeChatClient");
        var response = await client.PostAsync("api/chat/getChatReply", JsonContent.Create(new GetChatReplyRequestDto(messages, currentChatStage)), cancellationToken);

        if(!response.IsSuccessStatusCode)
            throw new Exception("Failed to get chat reply from the server.");

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);
        while(!reader.EndOfStream)
        {
            var textChunksJson = await reader.ReadLineAsync(cancellationToken);
            if(string.IsNullOrEmpty(textChunksJson))
                continue;

            var textChunks = JsonSerializer.Deserialize<IEnumerable<string?>>(textChunksJson) ?? [];
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

    /// <summary>
    /// Handles the completion of a chat stage by sending the messages to the server and appending the response to the ObservableStringBuilder.
    /// </summary>
    /// <param name="messages"></param>
    /// <param name="currentChatStage"></param>
    /// <param name="observableStringBuilder"></param>
    /// <param name="cancellationToken"></param>
    /// <returns> Returns chat completion stage if the chat stage is complete, otherwise returns the next chat stage.</returns>
    public async Task<ChatStage> HandleChatStageCompletion(IEnumerable<ChatMessage> messages, ChatStage currentChatStage, ObservableStringBuilder observableStringBuilder, CancellationToken cancellationToken = default)
    {
        var nextChatStage = getNextChatStage(currentChatStage);
        var isConversationComplete = nextChatStage >= Constants.CHAT_CONVERSATION_COMPLETE_STAGE;
        if(isConversationComplete)
            return Constants.CHAT_CONVERSATION_COMPLETE_STAGE;

        await GetChatReply(messages, nextChatStage, observableStringBuilder, cancellationToken);
        return nextChatStage;
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

    private static ChatStage getNextChatStage(ChatStage currentChatStage) => currentChatStage switch
    {
        ChatStage.ChiefComplaint => ChatStage.MedicalHistory,
        ChatStage.MedicalHistory => ChatStage.CurrentMedications,
        ChatStage.CurrentMedications => ChatStage.ClinicalSummary,
        _ => throw new ArgumentOutOfRangeException(nameof(currentChatStage), "Invalid chat stage.")
    };
}
