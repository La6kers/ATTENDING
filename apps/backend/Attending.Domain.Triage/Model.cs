namespace Attending.Domain.Triage;
public class Survey
{
    public long? Id { get; private set; }
    public DateTime TimeStamp { get; private set; } = DateTime.UtcNow;
    public int? MRN { get; private set; }
    public List<Vitals> Vitals { get; private set; } = [];
    public IEnumerable<Symptom> Symptoms => _symptoms;
    public IEnumerable<Differential> Differentials => _differential;

    private readonly List<Symptom> _symptoms = [];
    private readonly List<Differential> _differential = [];

    public void addSymptom(Symptom symptom)
    {
        ArgumentNullException.ThrowIfNull(symptom, nameof(symptom));
        _symptoms.Add(symptom);
    }

    public void AddSymptoms(IEnumerable<Symptom> symptoms)
    {
        ArgumentNullException.ThrowIfNull(symptoms, nameof(symptoms));
        _symptoms.AddRange(symptoms);
    }

    public void SetVitals(Vitals vitals)
    {
        ArgumentNullException.ThrowIfNull(vitals, nameof(vitals));

        Vitals ??= new();
        Vitals.Update(vitals);
    }
}

public class Vitals()
{
    public DateTime TimeStamp { get; set; } = DateTime.UtcNow;       // timestamp of the vitals measurement
    public double? TemperatureFahrenheit { get; private set; }       // body temperature in Fahrenheit
    public int? HeartRate { get; private set; }                      // beats per minute
    public int? RespiratoryRate { get; private set; }                // breaths per minute
    public int? BloodPressureSystolic { get; private set; }          // systolic blood pressure in mmHg
    public int? BloodPressureDiastolic { get; private set; }         // diastolic blood pressure in mmHg
    public double? OxygenSaturation { get; private set; }            // oxygen saturation percentage

    public void Update(Vitals vitals)
    {
        ArgumentNullException.ThrowIfNull(vitals, nameof(vitals));

        if(vitals.TemperatureFahrenheit.HasValue)
            TemperatureFahrenheit = vitals.TemperatureFahrenheit.Value;
        if(vitals.HeartRate.HasValue)
            HeartRate = vitals.HeartRate.Value;
        if(vitals.RespiratoryRate.HasValue)
            RespiratoryRate = vitals.RespiratoryRate.Value;
        if(vitals.BloodPressureSystolic.HasValue)
            BloodPressureSystolic = vitals.BloodPressureSystolic.Value;
        if(vitals.BloodPressureDiastolic.HasValue)
            BloodPressureDiastolic = vitals.BloodPressureDiastolic.Value;
        if(vitals.OxygenSaturation.HasValue)
            OxygenSaturation = vitals.OxygenSaturation.Value;
    }
}



public class Symptom(string description)
{
    public string Description { get; private set; } = description;
    public IEnumerable<SymptomDetail> Details { get; set; } = [];
}

public class SymptomDetail(string description)
{
    public string Description { get; private set; } = description;
}

public class Differential(string description)
{
    public string Description { get; private set; } = description;
}