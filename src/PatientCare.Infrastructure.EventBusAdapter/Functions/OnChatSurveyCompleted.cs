using Azure.Messaging.ServiceBus;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using PatientCare.Application.Diagnostics;
using SharedKernel;

namespace PatientCare.Infrastructure.EventBusAdapter.Functions;

public class OnChatSurveyCompleted(ILogger<OnChatSurveyCompleted> logger)
{
    private readonly ILogger<OnChatSurveyCompleted> _logger = logger;
    private readonly IReadWriteRepository<ClinicalSummary> _repository;

    [Function(nameof(OnChatSurveyCompleted))]
    public async Task Run(
        [ServiceBusTrigger("clinicalintake-chatsurvey-completed", "patientcare", Connection = "PatientcareEventBusConnection")]
        ServiceBusReceivedMessage message,
        ServiceBusMessageActions messageActions, CancellationToken cancellationToken)
    {
        var messageDto = message.Body.ToObjectFromJson<MessageDto>();
        ArgumentNullException.ThrowIfNull(messageDto, nameof(messageDto));

        await _repository.Add(new ClinicalSummary()
        {
            MedicalRecordNumber = messageDto.MedicalRecordNumber,
            ChiefComplaint = messageDto.Summary
        }, cancellationToken);

        // Complete the message
        await messageActions.CompleteMessageAsync(message);
    }

    private record MessageDto(
        int ClinicId,
        string MedicalRecordNumber,
        string Summary);
}