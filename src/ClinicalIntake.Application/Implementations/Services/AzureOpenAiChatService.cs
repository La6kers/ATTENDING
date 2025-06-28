using Azure.AI.OpenAI;
using OpenAI.Chat;
using System.Runtime.CompilerServices;
using OpenAIChatMessage = OpenAI.Chat.ChatMessage;

namespace ClinicalIntake.Application.Implementations.Services;
internal class AzureOpenAIChatService(AzureOpenAIClient azureOpenAIClient, string deploymentName, ChatCompletionOptions chatCompletionOptions)
{
    private readonly AzureOpenAIClient _azureOpenAIClient = azureOpenAIClient;
    private readonly string _deploymentName = deploymentName;
    private readonly ChatCompletionOptions _chatCompletionOptions = chatCompletionOptions;

    public IAsyncEnumerable<string> GetGatherSymptomsReply(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken)
    {
        if(messages == null || !messages.Any())
            return AsyncEnumerable.Empty<string>();

        IEnumerable<OpenAIChatMessage> openAIChatMessages = createOpenAIChatMessageList(SystemPrompts.GatherSymptoms, messages);
        return sendChatRequest(openAIChatMessages, cancellationToken);
    }
    public IAsyncEnumerable<string> GetClinicalSummaryReply(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken)
    {
        if(messages == null || !messages.Any())
            return AsyncEnumerable.Empty<string>();

        IEnumerable<OpenAIChatMessage> chatMessages = createOpenAIChatMessageList(SystemPrompts.ClinicalSummary, messages);
        return sendChatRequest(chatMessages, cancellationToken);
    }

    private static List<OpenAIChatMessage> createOpenAIChatMessageList(string systemMessage, IEnumerable<ChatMessage> messages)
    {
        List<OpenAIChatMessage> openAiChatMessages = [new SystemChatMessage(systemMessage)];

        foreach(var message in messages)
        {
            OpenAIChatMessage newOpenAiChatMessage = message.Role switch
            {
                ChatRole.User => new UserChatMessage(message.Content),
                ChatRole.Assistant => new AssistantChatMessage(message.Content),
                _ => throw new ArgumentException($"Unsupported chat role: {message.Role}", nameof(message.Role))
            };
            openAiChatMessages.Add(newOpenAiChatMessage);
        }

        return openAiChatMessages;
    }
    private async IAsyncEnumerable<string> sendChatRequest(IEnumerable<OpenAIChatMessage> openAIChatMessages, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        ChatClient chatClient = _azureOpenAIClient.GetChatClient(_deploymentName);
        var stream = chatClient.CompleteChatStreamingAsync(openAIChatMessages, _chatCompletionOptions, cancellationToken);

        await foreach(var update in stream.WithCancellation(cancellationToken))
            foreach(var updatePart in update.ContentUpdate)
                if(!string.IsNullOrEmpty(updatePart.Text))
                    yield return updatePart.Text;
    }

    private static class SystemPrompts
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