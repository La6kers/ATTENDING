using ClinicalIntake.Application.Chat.Services;
using System.Text.Json;
using IEventBus = ClinicalIntake.Application.Chat.Features.Events.ChatSurveyCompleted.IEventBus;

namespace ClinicalIntake.Application.Chat.FeatureImplementations.Events;

internal class AzureServiceBusEventBus(AzureServiceBusService azureServiceBusService) : IEventBus
{
    public async Task Trigger(ChatSurvey ChatSurvey)
    {
        var content = JsonSerializer.Serialize(ChatSurvey);
        await azureServiceBusService.SendMessage(content);
    }
}