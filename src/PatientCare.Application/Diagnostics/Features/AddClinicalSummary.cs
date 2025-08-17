using FluentResults;
using SharedKernel;
using Error = SharedKernel.Error;
using ExceptionalError = SharedKernel.ExceptionalError;

namespace PatientCare.Application.Diagnostics.Features;
public static class AddClinicalSummary
{
    public record Request(
        int ClinicId,
        string MedicalRecordNumber,
        VitalSigns VitalSigns,
        string ChiefComplaint) : ICommandRequest;

    public class Handler(IReadWriteRepository<ClinicalSummary> repository) : ICommandRequestHandler<Request>
    {
        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                if(request.ClinicId <= 0)
                    return Result.Fail(new Error(nameof(AddClinicalSummary), "Clinic ID must be greater than zero."));
                if(string.IsNullOrWhiteSpace(request.MedicalRecordNumber))
                    return Result.Fail(new Error(nameof(AddClinicalSummary), "Medical record number cannot be empty."));
                if(request.VitalSigns == null)
                    return Result.Fail(new Error(nameof(AddClinicalSummary), "Vital signs cannot be null."));
                var clinicalSummary = new ClinicalSummary
                {
                    ClinicId = request.ClinicId,
                    MedicalRecordNumber = request.MedicalRecordNumber,
                    VitalSigns = request.VitalSigns,
                    ChiefComplaint = request.ChiefComplaint
                };
                await repository.Add(clinicalSummary, cancellationToken);
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
