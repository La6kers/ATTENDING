using Azure.Messaging.ServiceBus;

namespace ClinicalIntake.Application.Chat.Services;
internal class AzureServiceBusService(ServiceBusSender serviceBusSender)
{
    public async Task SendMessage(string content)
    {
        ServiceBusMessage message = new ServiceBusMessage(content);
        await serviceBusSender.SendMessageAsync(message);
    }
}
