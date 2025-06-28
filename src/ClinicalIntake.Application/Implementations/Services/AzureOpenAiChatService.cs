using Azure.AI.OpenAI;
using OpenAI.Chat;
using System.Runtime.CompilerServices;

namespace ClinicalIntake.Application.Implementations.Services;
internal class AzureOpenAiChatService(AzureOpenAIClient azureOpenAIClient, string deploymentName, ChatCompletionOptions chatCompletionOptions)
{
    private readonly AzureOpenAIClient _azureOpenAIClient = azureOpenAIClient;
    private readonly string _deploymentName = deploymentName;
    private readonly ChatCompletionOptions _chatCompletionOptions = chatCompletionOptions;

    public async IAsyncEnumerable<string> GetGatherSymptomsReply(IEnumerable<string> messages, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if(messages == null || !messages.Any())
            yield break;

        IEnumerable<ChatMessage> chatMessages = createChatMessageList(SystemChatMessages.GatherSymptoms, messages);
        await foreach(var reply in sendChatRequest(chatMessages, cancellationToken))
            yield return reply;
    }

    public async IAsyncEnumerable<string> GetClinicalSummaryReply(IEnumerable<string> messages, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if(messages == null || !messages.Any())
            yield break;

        IEnumerable<ChatMessage> chatMessages = createChatMessageList(SystemChatMessages.ClinicalSummary, [.. messages]);
        await foreach(var reply in sendChatRequest(chatMessages, cancellationToken))
            yield return reply;
    }

    private static List<ChatMessage> createChatMessageList(string systemMessage, IEnumerable<string> messages)
    {
        List<ChatMessage> chatMessages = [new SystemChatMessage(systemMessage)];
        chatMessages.AddRange(messages.Select(message => new UserChatMessage(message)));
        return chatMessages;
    }
    private async IAsyncEnumerable<string> sendChatRequest(IEnumerable<ChatMessage> chatMessages, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        ChatClient chatClient = _azureOpenAIClient.GetChatClient(_deploymentName);
        var response = chatClient.CompleteChatStreamingAsync(chatMessages, _chatCompletionOptions, cancellationToken);

        await foreach(var update in response.WithCancellation(cancellationToken))
            foreach(var updatePart in update.ContentUpdate)
                if(!string.IsNullOrEmpty(updatePart.Text))
                    yield return updatePart.Text;
    }

    private static class SystemChatMessages
    {
        public const string GatherSymptoms = @"You are a clinical intake assistant. You will be asking questions that will get the patient's chief complaint, symptoms, medical history, and current medications. 
    
        Follow these steps:
        1. Gather information about the chief complaint
        2. Ask about symptoms, their duration, and severity
        3. Inquire about relevant medical history
        4. Ask about current medications
    
        When you have collected sufficient information, say ""[FINISH]""";
        public const string ClinicalSummary = @"You will be summarizing the patient's chief complaint, symptoms, medical history, and current medications into a concise clinical summary in paragraph form.";
    }
}