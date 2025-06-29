using Azure.AI.OpenAI;
using OpenAI.Chat;
using System.Runtime.CompilerServices;
using System.Text;
using OpenAIChatMessage = OpenAI.Chat.ChatMessage;

namespace ClinicalIntake.Application.SubContext.Chat.Implementations.Services;
internal class AzureOpenAIChatService(AzureOpenAIClient azureOpenAIClient, string deploymentName, ChatCompletionOptions chatCompletionOptions)
{
    private readonly AzureOpenAIClient _azureOpenAIClient = azureOpenAIClient;
    private readonly string _deploymentName = deploymentName;
    private readonly ChatCompletionOptions _chatCompletionOptions = chatCompletionOptions;

    public StreamingChatReply GetGatherSymptomsReply(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken)
    {
        if(messages == null || !messages.Any())
            return Constants.DefaultStreamingChatReply;

        IEnumerable<OpenAIChatMessage> openAIChatMessages = createOpenAIChatMessageList(SystemPrompts.GatherSymptoms, messages);
        return createStreamingChatResult(openAIChatMessages, cancellationToken);
    }
    public async Task<IEnumerable<string>> GetQuickRepliesAsync(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken)
    {
        if(messages == null || !messages.Any())
            return [];

        IEnumerable<OpenAIChatMessage> chatMessages = createOpenAIChatMessageList(SystemPrompts.QuickReplies, messages);
        var stream = sendChatRequest(chatMessages, cancellationToken);
        var jsonString = new StringBuilder();
        await foreach(var streamChunk in stream.WithCancellation(cancellationToken))
        {
            if(streamChunk == null) // Indicates an error occurred
                return [];

            jsonString.Append(streamChunk);
        }

        // Parse the JSON response to extract quick replies
        var result = System.Text.Json.JsonSerializer.Deserialize<List<String>>(jsonString.ToString());
        return result ?? [];
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
        List<OpenAIChatMessage> openAIChatMessages = [new SystemChatMessage(systemMessage)];

        foreach(var message in messages)
        {
            OpenAIChatMessage newOpenAiChatMessage = message.Role switch
            {
                ChatRole.User => new UserChatMessage(message.Content),
                ChatRole.Assistant => new AssistantChatMessage(message.Content),
                _ => throw new ArgumentException($"Unsupported chat role: {message.Role}", nameof(message.Role))
            };
            openAIChatMessages.Add(newOpenAiChatMessage);
        }

        return openAIChatMessages;
    }
    private StreamingChatReply createStreamingChatResult(IEnumerable<OpenAIChatMessage> openAIChatMessages, CancellationToken cancellationToken)
    {
        var completionSource = new TaskCompletionSource<bool>();

        try
        {
            var processedStream = processStreamForCompletion(openAIChatMessages, completionSource, cancellationToken);
            return new StreamingChatReply(processedStream, completionSource.Task);
        }
        catch(Exception ex)
        {
            completionSource.SetException(ex);
            return new StreamingChatReply(AsyncEnumerable.Empty<string>(), completionSource.Task);
        }
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

    private async IAsyncEnumerable<string> processStreamForCompletion(
        IEnumerable<OpenAIChatMessage> openAIChatMessages,
        TaskCompletionSource<bool> completionSource,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var buffer = new StringBuilder();
        const string finishMarker = "[FINISH]";

        await foreach(var chunk in sendChatRequestSafely(openAIChatMessages, completionSource, cancellationToken))
        {
            if(chunk == null) // Indicates an error occurred
                yield break;


            buffer.Append(chunk);
            var content = buffer.ToString();

            // Check if we have the finish marker
            var finishIndex = content.IndexOf(finishMarker, StringComparison.OrdinalIgnoreCase);
            if(finishIndex >= 0)
            {
                // Yield content before the marker (if any)
                if(finishIndex > 0)
                {
                    var beforeMarker = content[..finishIndex];
                    yield return beforeMarker;
                }

                // Mark conversation as complete
                completionSource.TrySetResult(true);
                yield break;
            }

            // Yield the chunk as normal
            yield return chunk;
        }

        // Stream ended without finish marker
        completionSource.TrySetResult(false);
    }

    private async IAsyncEnumerable<string?> sendChatRequestSafely(
        IEnumerable<OpenAIChatMessage> openAIChatMessages,
        TaskCompletionSource<bool> completionSource,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        IAsyncEnumerable<string> stream;

        try
        {
            stream = sendChatRequest(openAIChatMessages, cancellationToken);
        }
        catch(Exception exception)
        {
            completionSource.SetException(exception);
            yield break;
        }

        await foreach(var chunk in stream.WithCancellation(cancellationToken))
            yield return chunk;
    }

    private static class SystemPrompts
    {
        public const string GatherSymptoms = @"You are a clinical intake assistant. You will not answer any questions. You will be asking questions that will get the patient's chief complaint, symptoms, medical history, and current medications. 
    
        Follow these steps:
        1. Gather information about the chief complaint
        2. Ask about symptoms, their duration, and severity
        3. Inquire about relevant medical history
        4. Ask about current medications
    
        When you have collected sufficient information, say ""[FINISH]""";
        public const string QuickReplies = @"You will be generating quick replies based on the user's input. Your replies should be concise and relevant to the context of the conversation.
        The replies should be in the form of a list of strings, each representing a quick reply option for the user.
        return the list of quick replies as a JSON array.";
        public const string ClinicalSummary = @"You will be summarizing the patient's chief complaint, symptoms, medical history, and current medications into a concise clinical summary in paragraph form.";
    }
}