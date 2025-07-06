using Azure.AI.OpenAI;
using OpenAI.Chat;
using System.Runtime.CompilerServices;
using System.Text;
using OpenAIChatMessage = OpenAI.Chat.ChatMessage;

namespace ClinicalIntake.Application.Chat.Implementations.Services;
internal class AzureOpenAIChatService(AzureOpenAIClient azureOpenAIClient, string deploymentName, ChatCompletionOptions chatCompletionOptions)
{
    private readonly AzureOpenAIClient _azureOpenAIClient = azureOpenAIClient;
    private readonly string _deploymentName = deploymentName;
    private readonly ChatCompletionOptions _chatCompletionOptions = chatCompletionOptions;

    public StreamingChatReply GetChatReply(IEnumerable<ChatMessage> messages, ChatStage chatStage, CancellationToken cancellationToken)
    {
        if(messages == null || !messages.Any())
            return Constants.DefaultStreamingChatReply;

        var systemMessage = getSystemMessageByChatStage(chatStage);
        IEnumerable<OpenAIChatMessage> openAIChatMessages = createOpenAIChatMessageList(systemMessage, messages);
        return createStreamingChatResult(openAIChatMessages, cancellationToken);
    }
    public async Task<IEnumerable<string>> GetQuickReplies(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken)
    {
        if(messages == null || !messages.Any())
            return [];

        List<ChatMessage> lastSystemMessage = [];
        lastSystemMessage.Add(messages.Last(m => m.Role == ChatRole.Assistant));

        IEnumerable<OpenAIChatMessage> chatMessages = createOpenAIChatMessageList(SystemPrompts.QuickReplies, lastSystemMessage);
        var stream = sendChatRequest(chatMessages, cancellationToken);
        var jsonString = new StringBuilder();
        await foreach(var streamChunk in stream.WithCancellation(cancellationToken))
        {
            if(streamChunk == null) // Indicates an error occurred
                return [];

            jsonString.Append(streamChunk);
        }

        // Parse the JSON response to extract quick replies
        var result = System.Text.Json.JsonSerializer.Deserialize<List<string>>(jsonString.ToString());
        return result ?? [];
    }
    public async Task<string> GetClinicalSummaryReply(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken)
    {
        if(messages is null || !messages.Any())
            return string.Empty;

        IEnumerable<OpenAIChatMessage> chatMessages = createOpenAIChatMessageList(SystemPrompts.ClinicalSummary, messages);
        var stringBuilder = new StringBuilder();

        await foreach(var chunk in sendChatRequest(chatMessages, cancellationToken).WithCancellation(cancellationToken))
        {
            if(string.IsNullOrEmpty(chunk))
                continue;

            stringBuilder.Append(chunk);
        }

        return stringBuilder.ToString();
    }

    private static string getSystemMessageByChatStage(ChatStage chatStage)
    {
        return chatStage switch
        {
            ChatStage.ChiefComplaint => SystemPrompts.ChiefComplaint,
            ChatStage.SymptomAnalysis => SystemPrompts.GatherSymptoms,
            ChatStage.MedicalHistory => SystemPrompts.MedicalHistory,
            ChatStage.CurrentMedications => SystemPrompts.CurrentMedications,
            _ => throw new ArgumentOutOfRangeException(nameof(chatStage), chatStage, "Unsupported chat stage")
        };
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

            // Yield the chunk as normal
            yield return chunk;

            // Check if we have the finish marker
            var finishIndex = content.IndexOf(finishMarker, StringComparison.OrdinalIgnoreCase);
            if(finishIndex >= 0)
            {
                // Mark conversation as complete
                completionSource.TrySetResult(true);
                yield break;
            }
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
        public const string GatherSymptoms = @"You are a clinical intake assistant.
Your goal is to gather the following information from a patient through a step-by-step interview:
-Chief complaint
-Symptoms
  - Duration
  - Severity
-Relevant medical history
  - History of present illness (HPI)
  - Past medical history
  - Family history
  - Social history
  - Sexual history
  - Surgical history
-Current medications
Important Rules:
- Ask only one question at a time.
- Wait for the patient's response before continuing.
- Do not combine multiple questions into one message.
- Do not answer questions from the patient.
- Keep all questions polite, medically appropriate, and easy to understand.
- Once all information is collected, respond with: " + Constants.CHAT_STAGE_COMPLETED_MARKER;

        public const string ChiefComplaint = @"You are a clinical intake assistant.
Your goal is to begin gathering information from a patient.
Start by asking about:
1. Chief complaint
2. Symptoms
   - Duration
   - Severity

Important Rules:
- Ask only one question at a time.
- Wait for the patient's response before continuing.
- Do not combine multiple questions into one message.
- Do not answer questions from the patient.
- Keep all questions polite, medically appropriate, and easy to understand.
Once this section is complete, respond with: " + Constants.CHAT_STAGE_COMPLETED_MARKER;
        public const string MedicalHistory = @"Continue gathering the patient's medical history, including:
1. History of present illness (HPI)
2. Past medical history
3. Family history
4. Social history
5. Sexual history
6. Surgical history

Important Rules:
- Ask only one question at a time.
- Wait for the patient's response before continuing.
- Do not combine multiple questions into one message.
- Do not answer questions from the patient.
- Keep all questions polite, medically appropriate, and easy to understand.
Once this section is complete, respond with: " + Constants.CHAT_STAGE_COMPLETED_MARKER;
        public const string CurrentMedications = @"Now ask about the patient’s current medications.

Important Rules:
- Ask only one question at a time.
- Wait for the patient's response before continuing.
- Do not combine multiple questions into one message.
- Do not answer questions from the patient.
- Keep all questions polite, medically appropriate, and easy to understand.
Once this section is complete, respond with: " + Constants.CHAT_STAGE_COMPLETED_MARKER;

        public const string QuickReplies = @"Generate a JSON array of quick reply options based on the last question in the conversation.
- Replies must be short (2–4 words)
- Relevant and from the user's point of view
- Must be direct answers, not questions
- Output only the specified format. Do not include explanations, headers, or formatting outside of the instructions.";
        public const string ClinicalSummary = @"Summarize the patient's chief complaint, symptoms, medical history, and current medications into a single clinical paragraph.
Provide only the summary without any additional header or formatting.";
    }
}