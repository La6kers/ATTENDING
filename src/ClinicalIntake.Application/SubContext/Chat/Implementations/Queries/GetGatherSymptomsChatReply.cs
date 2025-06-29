using ClinicalIntake.Application.SubContext.Chat.Implementations.Services;
using Microsoft.Extensions.DependencyInjection;
using static ClinicalIntake.Application.SubContext.Chat.Features.Queries.GetGatherSymptomsChatReply;

namespace ClinicalIntake.Application.SubContext.Chat.Implementations.Queries;
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
