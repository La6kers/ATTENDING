namespace PatientCare.Application.Diagnostics;
public class ClinicalSummary()
{
    public int ClinicId { get; init; } = 0;
    public string MedicalRecordNumber { get; init; } = string.Empty;
    public VitalSigns VitalSigns { get; private set; } = new(0, 0, 0, 0.0, 0);
    public string ChiefComplaint { get; init; } = string.Empty;

    public void SetBloodPressure(int systolic, int diastolic)
    {
        VitalSigns = VitalSigns with
        {
            BloodPressureSystolic = systolic,
            BloodPressureDiastolic = diastolic
        };
    }
    public void SetHeartRate(int heartRate)
    {
        VitalSigns = VitalSigns with
        {
            HeartRate = heartRate
        };
    }
    public void SetTemperature(double temperatureFahrenheit)
    {
        VitalSigns = VitalSigns with
        {
            TemperatureFahrenheit = temperatureFahrenheit
        };
    }
    public void SetOxygenSaturation(int oxygenSaturation)
    {
        VitalSigns = VitalSigns with
        {
            OxygenSaturation = oxygenSaturation
        };
    }
}

public record VitalSigns(
    int? BloodPressureSystolic,
    int? BloodPressureDiastolic,
    int? HeartRate,
    double? TemperatureFahrenheit,
    int? OxygenSaturation);