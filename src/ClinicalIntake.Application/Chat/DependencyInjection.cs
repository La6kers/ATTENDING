using Azure;
using Azure.AI.OpenAI;
using Azure.Messaging.ServiceBus;
using ClinicalIntake.Application.Chat.FeatureImplementations.Events;
using ClinicalIntake.Application.Chat.Features.Events;
using ClinicalIntake.Application.Chat.Features.Queries;
using ClinicalIntake.Application.Chat.Implementations.Queries;
using ClinicalIntake.Application.Chat.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OpenAI.Chat;

namespace ClinicalIntake.Application.Chat;
public static class DependencyInjection
{
    //TODO: organize dependency injection handlers, implementations, and services

    // domain service
    public static IServiceCollection AddClinicalIntakeChatService(this IServiceCollection services)
    {
        return services
            .AddScoped<ClinicalIntakeChatService>()
            .addClinicalIntakeChatSubContext()
            .addImplementationAzureOpenAI()
            .addImplementationAzureEventBus();
    }

    // domain client
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

    // service bus
    private static IServiceCollection addImplementationAzureEventBus(this IServiceCollection services)
    {
        // Service Bus Client
        services.AddSingleton<ServiceBusClient>(provider =>
        {
            var configuration = provider.GetRequiredService<IConfiguration>();
            var connectionString = configuration["AzureServiceBusConnectionString"];
            ArgumentNullException.ThrowIfNull(connectionString, nameof(connectionString));
            return new(connectionString);
        });

        // Event Bus for ChatSurveyCompleted
        services
            .AddKeyedScoped<ServiceBusSender>(nameof(ChatSurveyCompleted), (provider, o) =>
            {
                var client = provider.GetRequiredService<ServiceBusClient>();
                return client.CreateSender("clinicalintake-chatsurvey-completed");
            })
            .AddKeyedScoped<ChatSurveyCompleted.IEventBus, AzureServiceBusEventBus>(nameof(ChatSurveyCompleted), (provider, o) =>
            {
                var serviceBusSender = provider.GetRequiredKeyedService<ServiceBusSender>(nameof(ChatSurveyCompleted));
                return new AzureServiceBusEventBus(new(serviceBusSender));
            });

        return services;
    }

    // chat service(llm)
    private static IServiceCollection addImplementationAzureOpenAI(this IServiceCollection services)
    {
        services.AddSingleton(provider =>
        {
            var configuration = provider.GetRequiredService<IConfiguration>();
            var azureOpenAIEndpoint = configuration["AzureOpenAIEndpoint"];
            ArgumentNullException.ThrowIfNull(azureOpenAIEndpoint, nameof(azureOpenAIEndpoint));
            var azureOpenAIKey = configuration["AzureOpenAIKey"];
            ArgumentNullException.ThrowIfNull(azureOpenAIKey, nameof(azureOpenAIKey));

            return new AzureOpenAIClient(new Uri(azureOpenAIEndpoint), new AzureKeyCredential(azureOpenAIKey));
        });
        services.AddSingleton(provider => new ChatCompletionOptions
        {
            MaxOutputTokenCount = 800,
            Temperature = 0.7f,
            TopP = 0.95f,
            FrequencyPenalty = 0,
            PresencePenalty = 0
        });

        services.AddSingleton(provider =>
        {
            var configuration = provider.GetRequiredService<IConfiguration>();
            var deploymentName = configuration["AzureOpenAIDeploymentName"];
            ArgumentNullException.ThrowIfNull(deploymentName, nameof(deploymentName));

            var azureOpenAIClient = provider.GetRequiredService<AzureOpenAIClient>();
            var chatCompletionOptions = provider.GetRequiredService<ChatCompletionOptions>();
            return new AzureOpenAIChatService(azureOpenAIClient, deploymentName, chatCompletionOptions);
        });

        return services
            .AddAzureOpenAIGetChatReply()
            .AddAzureOpenAIGetQuickReplies()
            .AddAzureOpenAIClinicalSummary();
    }

    // domain/subcontext
    private static IServiceCollection addClinicalIntakeChatSubContext(this IServiceCollection services)
    {
        services
            .AddGetChatReplyFeature()
            .AddGetQuickRepliesChatReplyFeature()
            .AddGetClinicalSummaryChatReplyFeature()
            .AddChatSurveyCompletedEvent();

        return services;
    }
}