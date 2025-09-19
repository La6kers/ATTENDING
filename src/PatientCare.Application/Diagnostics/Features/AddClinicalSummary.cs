using FluentResults;
using Microsoft.Extensions.DependencyInjection;
using SharedKernel;
using Error = SharedKernel.Error;
using ExceptionalError = SharedKernel.ExceptionalError;

namespace PatientCare.Application.Diagnostics.Features;
public static class AddClinicalSummary
{
    public record Request(
        int ClinicId,
        string ProviderName,
        string MedicalRecordNumber,
        string ChiefComplaint,
        string? PhoneNumber,
        DateTimeOffset AppointmentTime
        ) : ICommandRequest;

    internal static IServiceCollection AddAddClinicalSummaryFeature(this IServiceCollection services)
    {
        return services.AddScoped<ICommandRequestHandler<Request>, Handler>();
    }

    public class Handler(IReadWriteRepository<ClinicalSummary> repository) : ICommandRequestHandler<Request>
    {
        private readonly IReadWriteRepository<ClinicalSummary> _repository = repository;

        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                if(request.ClinicId <= 0)
                    return Result.Fail(new Error(nameof(AddClinicalSummary), "Clinic ID must be greater than zero."));
                if(string.IsNullOrWhiteSpace(request.MedicalRecordNumber))
                    return Result.Fail(new Error(nameof(AddClinicalSummary), "Medical record number cannot be empty."));

                var clinicalSummary = new ClinicalSummary
                {
                    ClinicId = request.ClinicId,
                    ProviderName = request.ProviderName,
                    MedicalRecordNumber = request.MedicalRecordNumber,
                    ChiefComplaint = request.ChiefComplaint,
                    PhoneNumber = request.PhoneNumber,
                    AppointmentTime = request.AppointmentTime
                };
                //TODO: check if MRN already exists before adding
                await _repository.Add(clinicalSummary, cancellationToken);
                return Result.Ok();
            }
            catch(Exception exception)
            {
                return Result.Fail(new ExceptionalError(nameof(AddClinicalSummary), exception))
                             .WithError("An error occurred while adding the clinical summary.");
            }
        }
    }
}
