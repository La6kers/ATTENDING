using ClinicalIntake.Application.SubContext.Chat.Implementations.Services;
using Microsoft.Extensions.DependencyInjection;
using static ClinicalIntake.Application.SubContext.Chat.Features.Queries.GetQuickRepliesChatReply;

namespace ClinicalIntake.Application.SubContext.Chat.Implementations.Queries;
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
            await _azureOpenAiChatService.GetQuickRepliesAsync(messages, cancellationToken);

    }
}