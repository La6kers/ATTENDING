using ClinicalIntake.Application.Implementations.Services;
using Microsoft.Extensions.DependencyInjection;
using static ClinicalIntake.Application.Features.Queries.GetGatherSymptomsChatReply;

namespace ClinicalIntake.Application.Implementations.Queries;
internal class GetChatReply
{
    internal static IServiceCollection AddAzureOpenAiGetChatReply(IServiceCollection services)
    {
        return services;
    }

    private class GetChatReplyServiceAzureOpenAi : IGetChatReplyService
    {
        private readonly AzureOpenAiChatService _azureOpenAiChatService;
        public GetChatReplyServiceAzureOpenAi(AzureOpenAiChatService azureOpenAiChatService)
        {
            _azureOpenAiChatService = azureOpenAiChatService;
        }
        public async Task<Response> GetChatReply(IEnumerable<string> messages, CancellationToken cancellationToken)
        {
            var chatResponse = await _azureOpenAiChatService.GetGatherSymptomsReply(messages, cancellationToken);
            return new Response(chatResponse, new List<string>());
        }
    }
}
