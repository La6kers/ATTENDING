using ClinicalIntake.Application.Implementations.Services;
using Microsoft.Extensions.DependencyInjection;
using static ClinicalIntake.Application.Features.Queries.GetGatherSymptomsChatReply;

namespace ClinicalIntake.Application.Implementations.Queries;
internal static class GetGatherSymptomsChatReply
{
    internal static IServiceCollection AddAzureOpenAiGetChatReply(IServiceCollection services)
    {
        return services.AddScoped<IChatService, ChatServiceAzureOpenAI>();
    }

    private class ChatServiceAzureOpenAI(AzureOpenAIChatService azureOpenAIChatService) : IChatService
    {
        private readonly AzureOpenAIChatService _azureOpenAiChatService = azureOpenAIChatService;

        public IAsyncEnumerable<string> GetReply(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken)
        {
            return _azureOpenAiChatService.GetGatherSymptomsReply(messages, cancellationToken);
        }
    }
}
