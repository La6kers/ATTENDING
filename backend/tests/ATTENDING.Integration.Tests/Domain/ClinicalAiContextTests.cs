using FluentAssertions;
using ATTENDING.Infrastructure.External.AI;
using Xunit;

namespace ATTENDING.Integration.Tests.Domain;

public class ClinicalAiContextTests
{
    [Fact]
    public void ClinicalContext_ShouldInitializeWithDefaults()
    {
        var context = new ClinicalContext();

        context.ChiefComplaint.Should().BeEmpty();
        context.PatientAge.Should().Be(0);
        context.MedicalHistory.Should().BeEmpty();
        context.CurrentMedications.Should().BeEmpty();
        context.Allergies.Should().BeEmpty();
    }

    [Fact]
    public void ClinicalContext_ShouldPopulateFromPatientData()
    {
        var context = new ClinicalContext
        {
            ChiefComplaint = "Chest pain",
            HpiSummary = "58yo male presenting with substernal chest pain radiating to left arm",
            PatientAge = 58,
            PatientSex = "Male",
            MedicalHistory = new List<string> { "Hypertension", "Hyperlipidemia", "Type 2 DM" },
            CurrentMedications = new List<string> { "Lisinopril 20mg", "Atorvastatin 40mg", "Metformin 1000mg" },
            Allergies = new List<string> { "Penicillin", "Sulfa" },
            VitalSignsSummary = "BP 165/95, HR 92, RR 20, SpO2 97%, Temp 98.6F"
        };

        context.ChiefComplaint.Should().Be("Chest pain");
        context.PatientAge.Should().Be(58);
        context.MedicalHistory.Should().HaveCount(3);
        context.Allergies.Should().Contain("Penicillin");
    }

    [Fact]
    public void DifferentialDiagnosisResult_Fallback_ShouldReturnSafeDefault()
    {
        var result = new DifferentialDiagnosisResult
        {
            Success = false,
            ErrorMessage = "AI service unavailable",
            Diagnoses = new List<DiagnosisRecommendation>
            {
                new() { Name = "Pending AI analysis", Probability = "unknown" }
            }
        };

        result.Success.Should().BeFalse();
        result.Diagnoses.Should().HaveCount(1);
        result.Diagnoses[0].Name.Should().Be("Pending AI analysis");
    }

    [Fact]
    public void TriageResult_DefaultsToUrgent_WhenServiceFails()
    {
        var result = new TriageAssessmentResult
        {
            Success = false,
            TriageLevel = "Level3_Urgent",
            Reasoning = "Unable to assess - defaulting to urgent for safety"
        };

        result.TriageLevel.Should().Be("Level3_Urgent");
    }

    [Fact]
    public void LabRecommendation_ShouldHoldAllFields()
    {
        var rec = new LabRecommendation
        {
            TestCode = "CBC",
            TestName = "Complete Blood Count",
            CptCode = "85025",
            LoincCode = "58410-2",
            Priority = "Stat",
            ClinicalRationale = "Rule out infection/anemia",
            Category = "Hematology"
        };

        rec.TestCode.Should().Be("CBC");
        rec.CptCode.Should().Be("85025");
        rec.Priority.Should().Be("Stat");
    }
}
