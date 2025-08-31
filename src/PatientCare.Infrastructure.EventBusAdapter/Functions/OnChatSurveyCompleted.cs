using Azure.Messaging.ServiceBus;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using PatientCare.Application.Diagnostics.Features;
using SharedKernel;

namespace PatientCare.Infrastructure.EventBusAdapter.Functions;

public class OnChatSurveyCompleted(Mediator mediator, ILogger<OnChatSurveyCompleted> logger)
{
    [Function(nameof(OnChatSurveyCompleted))]
    public async Task Run(
        [ServiceBusTrigger("clinicalintake-chatsurvey-completed", "patientcare", Connection = "Attending-EventBus")]
        ServiceBusReceivedMessage message,
        ServiceBusMessageActions messageActions, CancellationToken cancellationToken)
    {
        var messageDto = message.Body.ToObjectFromJson<MessageDto>();
        ArgumentNullException.ThrowIfNull(messageDto, nameof(messageDto));

        AddClinicalSummary.Request request = new(
            ClinicId: messageDto.ClinicId,
            MedicalRecordNumber: messageDto.MedicalRecordNumber,
            VitalSigns: new(null, null, null, null, null),
            ChiefComplaint: messageDto.Summary);

        try
        {
            var result = await mediator.Send(request, cancellationToken);
            if(result.IsFailed)
            {
                logger.LogError("Failed to process chat survey completed message: {Errors}", result.Errors);
                await messageActions.AbandonMessageAsync(message, cancellationToken: cancellationToken);
                return;
            }

            await messageActions.CompleteMessageAsync(message, cancellationToken);
        }
        catch(Exception exception)
        {
            await messageActions.AbandonMessageAsync(message, cancellationToken: cancellationToken);
            logger.LogError(exception, "An error occurred while processing the chat survey completed message.");
        }
    }

    private record MessageDto(
        int ClinicId,
        string MedicalRecordNumber,
        string Summary);
}