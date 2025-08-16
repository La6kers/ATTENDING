using ClinicalIntake.Application.Chat.Services;
using Microsoft.Extensions.DependencyInjection;
using static ClinicalIntake.Application.Chat.Features.Queries.GetQuickRepliesChatReply;

namespace ClinicalIntake.Application.Chat.FeatureImplementations.Queries;
internal static class GetQuickRepliesChatReply
{
    public static IServiceCollection AddAzureOpenAIGetQuickReplies(this IServiceCollection services)
    {
        return services.AddScoped<IChatService, ChatServiceAzureOpenAI>();
    }

    private class ChatServiceAzureOpenAI(AzureOpenAIChatService azureOpenAIChatService) : IChatService
    {
        private readonly AzureOpenAIChatService _azureOpenAiChatService = azureOpenAIChatService;

        public async Task<IEnumerable<string>> GetQuickReplies(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken) =>
            await _azureOpenAiChatService.GetQuickReplies(messages, cancellationToken);

    }
}