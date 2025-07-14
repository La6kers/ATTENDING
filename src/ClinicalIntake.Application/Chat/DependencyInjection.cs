using Azure;
using Azure.AI.OpenAI;
using ClinicalIntake.Application.Chat.Features.Queries;
using ClinicalIntake.Application.Chat.Implementations.Queries;
using ClinicalIntake.Application.Chat.Implementations.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OpenAI.Chat;

namespace ClinicalIntake.Application.Chat;
public static class DependencyInjection
{
    public static IServiceCollection AddClinicalIntakeChatService(this IServiceCollection services)
    {
        return services
            .AddScoped<ClinicalIntakeChatService>()
            .addClinicalIntakeChatSubContext()
            .addImplementationClinicalIntakeChatAzureOpenAI();
    }

    public static IServiceCollection AddClinicalIntakeChatClient(this IServiceCollection services)
    {

        services
            .AddScoped<ClinicalIntakeChatClient>()
            .AddHttpClient("ClinicalIntakeChatClient", (provider, client) =>
        {
            var configuration = provider.GetRequiredService<IConfiguration>();
            var baseUrl = configuration["ClinicalIntakeApiUrl"] ?? "https://localhost:5001/";

            client.BaseAddress = new Uri(baseUrl);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        });

        return services;
    }

    private static IServiceCollection addImplementationClinicalIntakeChatAzureOpenAI(this IServiceCollection services)
    {
        const string azureOpenAIEndpoint = "https://attending-dev-open-ai.openai.azure.com/";
        const string azureOpenAIKey = "93DXOskItpoFvO6PGcMb9QKGExZxZU4RTc30LyszuFmrARdngZA4JQQJ99BFACYeBjFXJ3w3AAABACOGnMAI";
        const string deploymentName = "clinical-intake-gpt-4o";

        services.AddSingleton(provider => new AzureOpenAIClient(new Uri(azureOpenAIEndpoint), new AzureKeyCredential(azureOpenAIKey)));
        services.AddSingleton(provider => new ChatCompletionOptions
        {
            MaxOutputTokenCount = 800,
            Temperature = 0.3f,
            TopP = 0.95f,
            FrequencyPenalty = 0,
            PresencePenalty = 0
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

    private static IServiceCollection addClinicalIntakeChatSubContext(this IServiceCollection services)
    {
        services
            .AddGetChatReplyFeature()
            .AddGetQuickRepliesChatReplyFeature()
            .AddGetClinicalSummaryChatReplyFeature();

        return services;
    }
}