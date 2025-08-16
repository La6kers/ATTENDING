namespace PatientCare.Application.Diagnostics;
public class ClinicalSummary
{
    public VitalSigns VitalSigns { get; init; } = new(0, 0, 0, 0.0, 0);
    public string ChiefComplaint { get; init; } = string.Empty;
}

public record VitalSigns(
    int BloodPressureSystolic,
    int BloodPressureDiastolic,
    int HeartRate,
    double TemperatureFahrenheit,
    int OxygenSaturation);