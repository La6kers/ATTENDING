using Azure.Messaging.ServiceBus;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace PatientCare.Infrastructure.EventBusAdapter.Functions
{
    public class OnChatSurveyCompleted(ILogger<OnChatSurveyCompleted> logger)
    {
        private readonly ILogger<OnChatSurveyCompleted> _logger = logger;

        [Function(nameof(OnChatSurveyCompleted))]
        public async Task Run(
            [ServiceBusTrigger("mytopic", "mysubscription", Connection = "PatientcareEventBusConnection")]
            ServiceBusReceivedMessage message,
            ServiceBusMessageActions messageActions)
        {
            _logger.LogInformation("Message ID: {id}", message.MessageId);
            _logger.LogInformation("Message Body: {body}", message.Body);
            _logger.LogInformation("Message Content-Type: {contentType}", message.ContentType);

            // Complete the message
            await messageActions.CompleteMessageAsync(message);
        }
    }
}
