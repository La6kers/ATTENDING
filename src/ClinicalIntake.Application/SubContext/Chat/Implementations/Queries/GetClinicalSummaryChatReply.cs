using ClinicalIntake.Application.SubContext.Chat.Implementations.Services;
using Microsoft.Extensions.DependencyInjection;
using static ClinicalIntake.Application.SubContext.Chat.Features.Queries.GetClinicalSummaryChatReply;

namespace ClinicalIntake.Application.SubContext.Chat.Implementations.Queries;
internal static class GetClinicalSummaryChatReply
{
    public static IServiceCollection AddAzureOpenAIClinicalSummary(this IServiceCollection services)
    {
        return services.AddScoped<IClinicalSummaryService, ChatServiceAzureOpenAI>();
    }

    private class ChatServiceAzureOpenAI(AzureOpenAIChatService azureOpenAIChatService) : IClinicalSummaryService
    {
        private readonly AzureOpenAIChatService _azureOpenAiChatService = azureOpenAIChatService;

        public IAsyncEnumerable<string> GetClinicalSummary(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken) =>
            _azureOpenAiChatService.GetClinicalSummaryReply(messages, cancellationToken);
    }
}
