using ClinicalIntake.Application.Chat;
using ClinicalIntake.Application.Chat.Implementations.Services;
using Microsoft.Extensions.DependencyInjection;
using static ClinicalIntake.Application.Chat.Features.Queries.GetGatherSymptomsChatReply;

namespace ClinicalIntake.Application.Chat.Implementations.Queries;
internal static class GetGatherSymptomsChatReply
{
    public static IServiceCollection AddAzureOpenAIGetChatReply(this IServiceCollection services)
    {
        return services.AddScoped<IChatService, ChatServiceAzureOpenAI>();
    }

    private class ChatServiceAzureOpenAI(AzureOpenAIChatService azureOpenAIChatService) : IChatService
    {
        private readonly AzureOpenAIChatService _azureOpenAiChatService = azureOpenAIChatService;

        public StreamingChatReply GetReply(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken) =>
            _azureOpenAiChatService.GetGatherSymptomsReply(messages, cancellationToken);
    }
}
