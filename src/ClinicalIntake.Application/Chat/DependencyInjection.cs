using Azure;
using Azure.AI.OpenAI;
using ClinicalIntake.Application.Chat.Features.Queries;
using ClinicalIntake.Application.Chat.Implementations.Queries;
using ClinicalIntake.Application.Chat.Implementations.Services;
using Microsoft.Extensions.DependencyInjection;
using OpenAI.Chat;

namespace ClinicalIntake.Application.Chat;
public static class DependencyInjection
{
    public static IServiceCollection AddSubContextClinicalIntakeChat(this IServiceCollection services)
    {
        services
            .AddGetGatherSymptomsChatReplyFeature()
            .AddGetQuickRepliesChatReplyFeature()
            .AddGetClinicalSummaryChatReplyFeature();

        return services;
    }

    public static IServiceCollection AddImplementationClinicalIntakeChatAzureOpenAI(this IServiceCollection services)
    {
        const string azureOpenAIEndpoint = "https://attending-dev-open-ai.openai.azure.com/";
        const string azureOpenAIKey = "93DXOskItpoFvO6PGcMb9QKGExZxZU4RTc30LyszuFmrARdngZA4JQQJ99BFACYeBjFXJ3w3AAABACOGnMAI";
        const string deploymentName = "clinical-intake-gpt-4o";

        services.AddSingleton(provider => new AzureOpenAIClient(new Uri(azureOpenAIEndpoint), new AzureKeyCredential(azureOpenAIKey)));
        services.AddSingleton(provider => new ChatCompletionOptions
        {
            Temperature = 0.7f,
        });

        services.AddSingleton(provider =>
        {
            var azureOpenAIClient = provider.GetRequiredService<AzureOpenAIClient>();
            var chatCompletionOptions = provider.GetRequiredService<ChatCompletionOptions>();
            return new AzureOpenAIChatService(azureOpenAIClient, deploymentName, chatCompletionOptions);
        });

        return services
            .AddAzureOpenAIGetChatReply()
            .AddAzureOpenAIGetQuickReplies()
            .AddAzureOpenAIClinicalSummary();
    }
}