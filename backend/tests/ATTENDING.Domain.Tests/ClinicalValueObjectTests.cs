using System.Collections.Generic;
using ATTENDING.Domain.ValueObjects;
using Xunit;

namespace ATTENDING.Domain.Tests;

/// <summary>
/// Tests for VitalSigns value object — Tier 0 clinical calculations.
/// These verify that pure domain logic runs correctly without any dependencies.
/// </summary>
public class VitalSignsTests
{
    // ── Factory validation ────────────────────────────────────────────────

    [Fact]
    public void Create_WithValidValues_ReturnsVitalSigns()
    {
        var vitals = VitalSigns.Create(
            systolicBp: 120, diastolicBp: 80,
            heartRate: 72, respiratoryRate: 16,
            spO2: 98, temperatureCelsius: 37.0m,
            weightKg: 70, heightCm: 175);

        Assert.Equal(120m, vitals.SystolicBp);
        Assert.Equal(80m, vitals.DiastolicBp);
        Assert.Equal(72m, vitals.HeartRate);
        Assert.Equal(16m, vitals.RespiratoryRate);
        Assert.Equal(98m, vitals.SpO2);
        Assert.Equal(37.0m, vitals.TemperatureCelsius);
    }

    [Theory]
    [MemberData(nameof(InvalidVitalSignsData))]
    public void Create_WithInvalidValues_Throws(
        decimal? sbp, decimal? dbp, decimal? hr,
        decimal? rr, decimal? spo2, decimal? temp)
    {
        Assert.ThrowsAny<ArgumentOutOfRangeException>(() =>
            VitalSigns.Create(sbp, dbp, hr, rr, spo2, temp));
    }

    public static IEnumerable<object?[]> InvalidVitalSignsData()
    {
        yield return new object?[] { -5m,  null, null, null, null, null };   // Negative SBP
        yield return new object?[] { 400m, null, null, null, null, null };   // SBP too high
        yield return new object?[] { null, null, 5m,   null, null, null };   // HR too low
        yield return new object?[] { null, null, 350m, null, null, null };   // HR too high
        yield return new object?[] { null, null, null, null, 110m, null };   // SpO2 > 100
        yield return new object?[] { null, null, null, null, null, 50m  };   // Temp > 45
    }

    // ── Calculated metrics ────────────────────────────────────────────────

    [Fact]
    public void MeanArterialPressure_CalculatesCorrectly()
    {
        // MAP = DBP + (SBP - DBP) / 3 = 80 + (120 - 80) / 3 = 93.3
        var vitals = VitalSigns.Create(systolicBp: 120, diastolicBp: 80);
        Assert.Equal(93.3m, vitals.MeanArterialPressure);
    }

    [Fact]
    public void ShockIndex_CalculatesCorrectly()
    {
        // SI = HR / SBP = 110 / 90 = 1.22
        var vitals = VitalSigns.Create(systolicBp: 90, heartRate: 110);
        Assert.Equal(1.22m, vitals.ShockIndex);
    }

    [Fact]
    public void Bmi_CalculatesCorrectly()
    {
        // BMI = 70 / (1.75)^2 = 22.9
        var vitals = VitalSigns.Create(weightKg: 70, heightCm: 175);
        Assert.Equal(22.9m, vitals.Bmi);
    }

    [Fact]
    public void PulsePressure_CalculatesCorrectly()
    {
        var vitals = VitalSigns.Create(systolicBp: 160, diastolicBp: 60);
        Assert.Equal(100m, vitals.PulsePressure);
    }

    [Fact]
    public void NullValues_ReturnNullCalculations()
    {
        var vitals = VitalSigns.Create(); // All nulls
        Assert.Null(vitals.MeanArterialPressure);
        Assert.Null(vitals.ShockIndex);
        Assert.Null(vitals.Bmi);
        Assert.Null(vitals.PulsePressure);
    }

    // ── Clinical flags ────────────────────────────────────────────────────

    [Fact]
    public void ClinicalFlags_NormalVitals_AllFalse()
    {
        var vitals = VitalSigns.Create(
            systolicBp: 120, diastolicBp: 80,
            heartRate: 72, respiratoryRate: 16,
            spO2: 98, temperatureCelsius: 37.0m);

        Assert.False(vitals.IsTachycardic);
        Assert.False(vitals.IsBradycardic);
        Assert.False(vitals.IsHypotensive);
        Assert.False(vitals.IsHypertensive);
        Assert.False(vitals.IsFebrile);
        Assert.False(vitals.IsHypoxic);
        Assert.False(vitals.IsTachypneic);
        Assert.False(vitals.IsHemodynamicallyUnstable);
    }

    [Fact]
    public void IsHemodynamicallyUnstable_ShockPresentation_True()
    {
        // Hypotensive + tachycardic + elevated shock index
        var vitals = VitalSigns.Create(
            systolicBp: 80, diastolicBp: 50,
            heartRate: 130);

        Assert.True(vitals.IsHypotensive);
        Assert.True(vitals.IsTachycardic);
        Assert.True(vitals.HasElevatedShockIndex);
        Assert.True(vitals.IsHemodynamicallyUnstable);
    }

    [Fact]
    public void SirsCriteriaCount_SepsisPresentation_Returns2()
    {
        // Febrile + tachycardic = 2 SIRS criteria
        var vitals = VitalSigns.Create(
            heartRate: 95,            // >90 = SIRS criterion
            temperatureCelsius: 38.5m); // >38 = SIRS criterion

        Assert.Equal(2, vitals.SirsCriteriaCount);
    }

    [Fact]
    public void SirsCriteriaCount_AllMet_Returns3()
    {
        var vitals = VitalSigns.Create(
            heartRate: 95,
            respiratoryRate: 22,
            temperatureCelsius: 38.5m);

        Assert.Equal(3, vitals.SirsCriteriaCount);
    }

    // ── ToStructuredSummary ───────────────────────────────────────────────

    [Fact]
    public void ToStructuredSummary_IncludesFlags()
    {
        var vitals = VitalSigns.Create(
            systolicBp: 80, diastolicBp: 50,
            heartRate: 130, spO2: 88,
            temperatureCelsius: 39.0m);

        var summary = vitals.ToStructuredSummary();

        Assert.Contains("HEMODYNAMICALLY UNSTABLE", summary);
        Assert.Contains("HYPOXIC", summary);
        Assert.Contains("FEBRILE", summary);
        Assert.Contains("Shock Index", summary);
        Assert.Contains("MAP", summary);
    }
}

/// <summary>
/// Tests for LabPanel and RecentLabResult value objects.
/// </summary>
public class LabPanelTests
{
    [Fact]
    public void RenalFunction_NormalCreatinine_ReturnsNormal()
    {
        var panel = new LabPanel
        {
            Results = new[]
            {
                new RecentLabResult
                {
                    LoincCode = "2160-0", TestName = "Creatinine",
                    Value = 0.9m, Unit = "mg/dL",
                    ReferenceRangeLow = 0.7m, ReferenceRangeHigh = 1.3m,
                    ResultedAt = DateTime.UtcNow.AddHours(-2)
                }
            }
        };

        Assert.Equal("Normal", panel.RenalFunction.Status);
    }

    [Fact]
    public void RenalFunction_ElevatedCreatinine_ReturnsModerateImpairment()
    {
        var panel = new LabPanel
        {
            Results = new[]
            {
                new RecentLabResult
                {
                    LoincCode = "2160-0", TestName = "Creatinine",
                    Value = 2.5m, Unit = "mg/dL",
                    ReferenceRangeLow = 0.7m, ReferenceRangeHigh = 1.3m,
                    ResultedAt = DateTime.UtcNow.AddHours(-1)
                }
            }
        };

        Assert.Equal("Moderate impairment", panel.RenalFunction.Status);
        Assert.Contains("dose-adjust", panel.RenalFunction.Detail);
    }

    [Fact]
    public void RenalFunction_EgfrBased_ReturnsCkdStage()
    {
        var panel = new LabPanel
        {
            Results = new[]
            {
                new RecentLabResult
                {
                    LoincCode = "48642-3", TestName = "eGFR",
                    Value = 45m, Unit = "mL/min",
                    ResultedAt = DateTime.UtcNow.AddHours(-1)
                }
            }
        };

        Assert.Equal("Moderate impairment", panel.RenalFunction.Status);
        Assert.Contains("CKD 3", panel.RenalFunction.Detail);
    }

    [Fact]
    public void HepaticFunction_ElevatedLiverEnzymes_ReturnsImpairment()
    {
        var panel = new LabPanel
        {
            Results = new[]
            {
                new RecentLabResult
                {
                    LoincCode = "1742-6", TestName = "ALT",
                    Value = 180m, Unit = "IU/L",
                    ReferenceRangeHigh = 40m,
                    ResultedAt = DateTime.UtcNow
                },
                new RecentLabResult
                {
                    LoincCode = "1920-8", TestName = "AST",
                    Value = 220m, Unit = "IU/L",
                    ReferenceRangeHigh = 40m,
                    ResultedAt = DateTime.UtcNow
                }
            }
        };

        Assert.Equal("Severe impairment", panel.HepaticFunction.Status);
        Assert.Contains("hepatotoxin", panel.HepaticFunction.Detail);
    }

    [Fact]
    public void AbnormalResults_SortsCorrectly()
    {
        var panel = new LabPanel
        {
            Results = new[]
            {
                new RecentLabResult
                {
                    LoincCode = "2160-0", TestName = "Creatinine",
                    Value = 2.5m, Unit = "mg/dL",
                    ReferenceRangeHigh = 1.3m,
                    ResultedAt = DateTime.UtcNow
                },
                new RecentLabResult
                {
                    LoincCode = "2823-3", TestName = "Potassium",
                    Value = 6.8m, Unit = "mEq/L",
                    ReferenceRangeHigh = 5.0m,
                    IsCritical = true,
                    ResultedAt = DateTime.UtcNow
                },
                new RecentLabResult
                {
                    LoincCode = "718-7", TestName = "Hemoglobin",
                    Value = 13.5m, Unit = "g/dL",
                    ReferenceRangeLow = 12.0m,
                    ReferenceRangeHigh = 17.0m,
                    ResultedAt = DateTime.UtcNow
                }
            }
        };

        var abnormal = panel.AbnormalResults;
        Assert.Equal(2, abnormal.Count);
        Assert.Equal("Potassium", abnormal[0].TestName); // Critical first
        Assert.Equal("Creatinine", abnormal[1].TestName);
    }

    [Fact]
    public void RecentLabResult_Flag_CalculatesCorrectly()
    {
        var high = new RecentLabResult
        {
            Value = 2.5m, ReferenceRangeHigh = 1.3m,
            LoincCode = "2160-0", TestName = "Cr", Unit = "mg/dL",
            ResultedAt = DateTime.UtcNow
        };
        var low = new RecentLabResult
        {
            Value = 3.0m, ReferenceRangeLow = 4.0m,
            LoincCode = "2823-3", TestName = "K", Unit = "mEq/L",
            ResultedAt = DateTime.UtcNow
        };
        var normal = new RecentLabResult
        {
            Value = 5.0m, ReferenceRangeLow = 4.0m, ReferenceRangeHigh = 6.0m,
            LoincCode = "test", TestName = "test", Unit = "U",
            ResultedAt = DateTime.UtcNow
        };

        Assert.Equal("H", high.Flag);
        Assert.Equal("L", low.Flag);
        Assert.Equal("N", normal.Flag);
        Assert.True(high.IsAbnormal);
        Assert.True(low.IsAbnormal);
        Assert.False(normal.IsAbnormal);
    }
}
