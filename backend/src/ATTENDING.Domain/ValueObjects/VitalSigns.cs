namespace ATTENDING.Domain.ValueObjects;

/// <summary>
/// Strongly-typed vital signs with derived clinical metrics.
/// Pure value object — no dependencies, no I/O.
/// 
/// Tier 0 Intelligence: runs on any machine, zero network required.
/// A rural clinic with no connectivity still gets:
///   "Shock Index: 1.24, MAP: 63 → HEMODYNAMICALLY UNSTABLE"
/// from the domain layer alone.
/// 
/// Replaces the string-based VitalSignsSummary in ClinicalContext.
/// The AI receives quantitative data it can reason about.
/// </summary>
public record VitalSigns
{
    // ── Primary measurements ──────────────────────────────────────────────

    public decimal? SystolicBp { get; init; }
    public decimal? DiastolicBp { get; init; }
    public decimal? HeartRate { get; init; }
    public decimal? RespiratoryRate { get; init; }
    public decimal? SpO2 { get; init; }
    public decimal? TemperatureCelsius { get; init; }
    public decimal? WeightKg { get; init; }
    public decimal? HeightCm { get; init; }

    /// <summary>
    /// When these vitals were recorded. Vitals from 6 hours ago
    /// mean something different than vitals from now.
    /// </summary>
    public DateTime? RecordedAt { get; init; }

    // ── Calculated metrics (Tier 0 — pure math, always available) ─────────

    /// <summary>
    /// Mean Arterial Pressure = DBP + (SBP - DBP) / 3.
    /// Target: 65–110 mmHg.  Below 65: organ hypoperfusion risk.
    /// </summary>
    public decimal? MeanArterialPressure => SystolicBp.HasValue && DiastolicBp.HasValue
        ? Math.Round(DiastolicBp.Value + (SystolicBp.Value - DiastolicBp.Value) / 3, 1)
        : null;

    /// <summary>
    /// Shock Index = HR / SBP.  Normal: 0.5–0.7.
    /// &gt; 0.9 early shock.  &gt; 1.0 significant compromise.  &gt; 1.4 severe shock.
    /// More predictive than HR or BP alone for occult shock.
    /// </summary>
    public decimal? ShockIndex => HeartRate.HasValue && SystolicBp.HasValue && SystolicBp > 0
        ? Math.Round(HeartRate.Value / SystolicBp.Value, 2)
        : null;

    /// <summary>
    /// Body Mass Index = weight(kg) / height(m)^2.
    /// Relevant for weight-based drug dosing and respiratory risk.
    /// </summary>
    public decimal? Bmi => WeightKg.HasValue && HeightCm.HasValue && HeightCm > 0
        ? Math.Round(WeightKg.Value / ((HeightCm.Value / 100) * (HeightCm.Value / 100)), 1)
        : null;

    /// <summary>
    /// Pulse pressure = SBP - DBP.  Normal: 30–40 mmHg.
    /// Widened (&gt;60): aortic regurgitation, sepsis, increased ICP.
    /// Narrowed (&lt;25): heart failure, tamponade, aortic stenosis.
    /// </summary>
    public decimal? PulsePressure => SystolicBp.HasValue && DiastolicBp.HasValue
        ? SystolicBp.Value - DiastolicBp.Value
        : null;

    // ── Clinical flags (Tier 0 — boolean, no AI needed) ───────────────────

    public bool IsTachycardic => HeartRate > 100;
    public bool IsBradycardic => HeartRate < 60;
    public bool IsHypotensive => SystolicBp < 90;
    public bool IsHypertensive => SystolicBp >= 180;
    public bool IsHypertensiveUrgency => SystolicBp >= 180 || DiastolicBp >= 120;
    public bool IsFebrile => TemperatureCelsius > 38.0m;
    public bool IsHypothermic => TemperatureCelsius < 35.0m;
    public bool IsHypoxic => SpO2 < 92;
    public bool IsSeverelyHypoxic => SpO2 < 88;
    public bool IsTachypneic => RespiratoryRate > 20;
    public bool IsBradypneic => RespiratoryRate < 10;
    public bool HasElevatedShockIndex => ShockIndex > 0.9m;
    public bool HasInadequatePerfusion => MeanArterialPressure < 65;

    /// <summary>
    /// True if ANY vital sign suggests hemodynamic compromise.
    /// Tier 0 — no network, no AI.
    /// </summary>
    public bool IsHemodynamicallyUnstable =>
        IsHypotensive || HasElevatedShockIndex || HasInadequatePerfusion ||
        (IsTachycardic && IsHypotensive);

    /// <summary>
    /// SIRS criteria count.  2+ criteria with suspected infection = sepsis screen.
    /// Criteria: Temp &gt;38 or &lt;36, HR &gt;90, RR &gt;20.  (WBC requires lab.)
    /// </summary>
    public int SirsCriteriaCount
    {
        get
        {
            int count = 0;
            if (TemperatureCelsius > 38.0m || TemperatureCelsius < 36.0m) count++;
            if (HeartRate > 90) count++;
            if (RespiratoryRate > 20) count++;
            return count;
        }
    }

    // ── Formatting ────────────────────────────────────────────────────────

    /// <summary>
    /// Structured summary for AI prompts and provider display.
    /// Includes calculated values so the AI doesn't recompute them.
    /// </summary>
    public string ToStructuredSummary()
    {
        var parts = new List<string>();

        if (SystolicBp.HasValue && DiastolicBp.HasValue)
            parts.Add($"BP: {SystolicBp}/{DiastolicBp} mmHg (MAP: {MeanArterialPressure})");
        if (HeartRate.HasValue)
            parts.Add($"HR: {HeartRate} bpm");
        if (SystolicBp.HasValue && HeartRate.HasValue)
            parts.Add($"Shock Index: {ShockIndex}");
        if (RespiratoryRate.HasValue)
            parts.Add($"RR: {RespiratoryRate}/min");
        if (SpO2.HasValue)
            parts.Add($"SpO2: {SpO2}%");
        if (TemperatureCelsius.HasValue)
            parts.Add($"Temp: {TemperatureCelsius}°C ({ToFahrenheit(TemperatureCelsius.Value):F1}°F)");
        if (Bmi.HasValue)
            parts.Add($"BMI: {Bmi}");

        var flags = new List<string>();
        if (IsHemodynamicallyUnstable) flags.Add("HEMODYNAMICALLY UNSTABLE");
        if (IsHypoxic) flags.Add("HYPOXIC");
        if (IsFebrile) flags.Add("FEBRILE");
        if (IsHypertensiveUrgency) flags.Add("HYPERTENSIVE URGENCY");
        if (SirsCriteriaCount >= 2) flags.Add($"SIRS ({SirsCriteriaCount}/3 criteria met)");

        if (flags.Count > 0)
            parts.Add($"FLAGS: {string.Join(", ", flags)}");

        return string.Join(" | ", parts);
    }

    // ── Factory with validation ───────────────────────────────────────────

    /// <summary>
    /// Factory method with physiologically plausible range validation.
    /// Rejects impossible values that would poison AI reasoning.
    /// </summary>
    public static VitalSigns Create(
        decimal? systolicBp = null, decimal? diastolicBp = null,
        decimal? heartRate = null, decimal? respiratoryRate = null,
        decimal? spO2 = null, decimal? temperatureCelsius = null,
        decimal? weightKg = null, decimal? heightCm = null,
        DateTime? recordedAt = null)
    {
        if (systolicBp.HasValue && (systolicBp < 30 || systolicBp > 350))
            throw new ArgumentOutOfRangeException(nameof(systolicBp),
                $"SBP {systolicBp} mmHg outside plausible range (30-350)");
        if (diastolicBp.HasValue && (diastolicBp < 10 || diastolicBp > 250))
            throw new ArgumentOutOfRangeException(nameof(diastolicBp),
                $"DBP {diastolicBp} mmHg outside plausible range (10-250)");
        if (heartRate.HasValue && (heartRate < 10 || heartRate > 300))
            throw new ArgumentOutOfRangeException(nameof(heartRate),
                $"HR {heartRate} bpm outside plausible range (10-300)");
        if (respiratoryRate.HasValue && (respiratoryRate < 2 || respiratoryRate > 70))
            throw new ArgumentOutOfRangeException(nameof(respiratoryRate),
                $"RR {respiratoryRate}/min outside plausible range (2-70)");
        if (spO2.HasValue && (spO2 < 30 || spO2 > 100))
            throw new ArgumentOutOfRangeException(nameof(spO2),
                $"SpO2 {spO2}% outside plausible range (30-100)");
        if (temperatureCelsius.HasValue && (temperatureCelsius < 25 || temperatureCelsius > 45))
            throw new ArgumentOutOfRangeException(nameof(temperatureCelsius),
                $"Temp {temperatureCelsius}C outside plausible range (25-45)");
        if (weightKg.HasValue && (weightKg <= 0 || weightKg > 700))
            throw new ArgumentOutOfRangeException(nameof(weightKg));
        if (heightCm.HasValue && (heightCm <= 0 || heightCm > 300))
            throw new ArgumentOutOfRangeException(nameof(heightCm));

        return new VitalSigns
        {
            SystolicBp = systolicBp,
            DiastolicBp = diastolicBp,
            HeartRate = heartRate,
            RespiratoryRate = respiratoryRate,
            SpO2 = spO2,
            TemperatureCelsius = temperatureCelsius,
            WeightKg = weightKg,
            HeightCm = heightCm,
            RecordedAt = recordedAt ?? DateTime.UtcNow
        };
    }

    private static decimal ToFahrenheit(decimal celsius) => celsius * 9 / 5 + 32;
}
