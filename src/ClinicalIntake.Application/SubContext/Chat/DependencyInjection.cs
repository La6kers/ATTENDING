using ClinicalIntake.Application.SubContext.Chat.Features.Queries;
using Microsoft.Extensions.DependencyInjection;

namespace ClinicalIntake.Application.SubContext.Chat;
internal static class DependencyInjection
{
    internal static IServiceCollection AddChatSubContext(this IServiceCollection services)
    {
        services
            .AddGetGatherSymptomsChatReplyFeature()
            .AddGetQuickRepliesChatReplyFeature()
            .AddGetClinicalSummaryChatReplyFeature();

        return services;
    }
}