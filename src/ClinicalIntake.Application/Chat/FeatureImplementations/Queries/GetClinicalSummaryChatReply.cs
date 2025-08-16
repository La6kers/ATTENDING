using ClinicalIntake.Application.Chat.Services;
using Microsoft.Extensions.DependencyInjection;
using static ClinicalIntake.Application.Chat.Features.Queries.GetClinicalSummaryChatReply;

namespace ClinicalIntake.Application.Chat.FeatureImplementations.Queries;
internal static class GetClinicalSummaryChatReply
{
    public static IServiceCollection AddAzureOpenAIClinicalSummary(this IServiceCollection services)
    {
        return services.AddScoped<IClinicalSummaryService, ChatServiceAzureOpenAI>();
    }

    private class ChatServiceAzureOpenAI(AzureOpenAIChatService azureOpenAIChatService) : IClinicalSummaryService
    {
        private readonly AzureOpenAIChatService _azureOpenAiChatService = azureOpenAIChatService;

        public async Task<string> GetClinicalSummary(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken) =>
            await _azureOpenAiChatService.GetClinicalSummaryReply(messages, cancellationToken);
    }
}
