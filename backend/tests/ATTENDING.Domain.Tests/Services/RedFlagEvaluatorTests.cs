using FluentAssertions;
using ATTENDING.Domain.Services;
using Xunit;

namespace ATTENDING.Domain.Tests.Services;

/// <summary>
/// Unit tests for RedFlagEvaluator
/// </summary>
public class RedFlagEvaluatorTests
{
    private readonly RedFlagEvaluator _evaluator;

    public RedFlagEvaluatorTests()
    {
        _evaluator = new RedFlagEvaluator();
    }

    #region Emergency Detection Tests

    [Theory]
    [InlineData("I have severe chest pain radiating to my arm", "Cardiovascular")]
    [InlineData("crushing chest pain and shortness of breath", "Cardiovascular")]
    [InlineData("I can't breathe, difficulty breathing", "Respiratory")]
    [InlineData("sudden weakness on one side", "Neurological")]
    [InlineData("worst headache of my life", "Neurological")]
    [InlineData("I want to kill myself", "Psychiatric")]
    [InlineData("having suicidal thoughts", "Psychiatric")]
    public void Evaluate_WithEmergencySymptoms_ShouldReturnEmergency(string symptoms, string expectedCategory)
    {
        // Act
        var result = _evaluator.Evaluate(symptoms, null, null);

        // Assert
        result.IsEmergency.Should().BeTrue();
        result.HasRedFlags.Should().BeTrue();
        result.RedFlags.Should().ContainSingle(f => f.Category == expectedCategory);
    }

    [Theory]
    [InlineData("severe bleeding from a wound", "Trauma")]
    [InlineData("gunshot wound to the abdomen", "Trauma")]
    [InlineData("stab wound in chest", "Trauma")]
    public void Evaluate_WithTraumaSymptoms_ShouldReturnCritical(string symptoms, string expectedCategory)
    {
        // Act
        var result = _evaluator.Evaluate(symptoms, null, null);

        // Assert
        result.HasRedFlags.Should().BeTrue();
        result.RedFlags.Should().Contain(f => f.Category == expectedCategory);
        result.RedFlags.Should().Contain(f => f.Severity == "Critical");
    }

    [Theory]
    [InlineData("my throat is swelling shut", "Allergy")]
    [InlineData("anaphylaxis after eating peanuts", "Allergy")]
    public void Evaluate_WithAllergyEmergency_ShouldReturnEmergency(string symptoms, string expectedCategory)
    {
        // Act
        var result = _evaluator.Evaluate(symptoms, null, null);

        // Assert
        result.IsEmergency.Should().BeTrue();
        result.HasRedFlags.Should().BeTrue();
        result.RedFlags.Should().Contain(f => f.Category == expectedCategory);
    }

    #endregion

    #region Pain Severity Tests

    [Fact]
    public void Evaluate_WithPainSeverity10_ShouldFlagAsRedFlag()
    {
        // Arrange
        var symptoms = "moderate headache";

        // Act
        var result = _evaluator.Evaluate(symptoms, null, 10);

        // Assert
        result.HasRedFlags.Should().BeTrue();
        result.RedFlags.Should().Contain(f => f.Category == "PainSeverity");
    }

    [Fact]
    public void Evaluate_WithPainSeverity5_ShouldNotFlagForPainAlone()
    {
        // Arrange
        var symptoms = "mild stomach ache";

        // Act
        var result = _evaluator.Evaluate(symptoms, null, 5);

        // Assert
        result.RedFlags.Should().NotContain(f => f.Category == "PainSeverity");
    }

    #endregion

    #region Non-Emergency Tests

    [Theory]
    [InlineData("I have a runny nose")]
    [InlineData("mild headache for 2 days")]
    [InlineData("sore throat and cough")]
    [InlineData("twisted my ankle yesterday")]
    [InlineData("feeling a bit tired lately")]
    public void Evaluate_WithNonEmergencySymptoms_ShouldNotFlagEmergency(string symptoms)
    {
        // Act
        var result = _evaluator.Evaluate(symptoms, null, null);

        // Assert
        result.IsEmergency.Should().BeFalse();
    }

    [Fact]
    public void Evaluate_WithEmptySymptoms_ShouldReturnNoRedFlags()
    {
        // Act
        var result = _evaluator.Evaluate("", null, null);

        // Assert
        result.HasRedFlags.Should().BeFalse();
        result.IsEmergency.Should().BeFalse();
        result.RedFlags.Should().BeEmpty();
    }

    #endregion

    #region Clinical Category Tests

    [Theory]
    [InlineData("high fever and confusion", "Infectious")]
    [InlineData("stiff neck with fever", "Infectious")]
    public void Evaluate_WithInfectiousSymptoms_ShouldFlagAsEmergent(string symptoms, string expectedCategory)
    {
        // Act
        var result = _evaluator.Evaluate(symptoms, null, null);

        // Assert
        result.HasRedFlags.Should().BeTrue();
        result.RedFlags.Should().Contain(f => f.Category == expectedCategory);
    }

    [Theory]
    [InlineData("vomiting blood", "GI_Bleeding")]
    [InlineData("black tarry stool", "GI_Bleeding")]
    public void Evaluate_WithGIBleedingSymptoms_ShouldFlagAsEmergent(string symptoms, string expectedCategory)
    {
        // Act
        var result = _evaluator.Evaluate(symptoms, null, null);

        // Assert
        result.HasRedFlags.Should().BeTrue();
        result.RedFlags.Should().Contain(f => f.Category == expectedCategory);
    }

    [Theory]
    [InlineData("overdose on pills", "Toxicology")]
    [InlineData("poisoning", "Toxicology")]
    public void Evaluate_WithToxicologySymptoms_ShouldFlagAsCritical(string symptoms, string expectedCategory)
    {
        // Act
        var result = _evaluator.Evaluate(symptoms, null, null);

        // Assert
        result.IsEmergency.Should().BeTrue();
        result.HasRedFlags.Should().BeTrue();
        result.RedFlags.Should().Contain(f => f.Category == expectedCategory);
    }

    [Theory]
    [InlineData("pregnant with vaginal bleeding", "Obstetric")]
    [InlineData("pregnancy bleeding", "Obstetric")]
    public void Evaluate_WithObstetricSymptoms_ShouldFlagAsEmergent(string symptoms, string expectedCategory)
    {
        // Act
        var result = _evaluator.Evaluate(symptoms, null, null);

        // Assert
        result.HasRedFlags.Should().BeTrue();
        result.RedFlags.Should().Contain(f => f.Category == expectedCategory);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void Evaluate_WithNullChiefComplaint_ShouldHandleGracefully()
    {
        // Act
        var result = _evaluator.Evaluate(null!, null, null);

        // Assert
        result.HasRedFlags.Should().BeFalse();
        result.IsEmergency.Should().BeFalse();
    }

    [Fact]
    public void Evaluate_CaseInsensitive_ShouldDetectRedFlags()
    {
        // Arrange
        var symptomsLower = "chest pain radiating to arm";
        var symptomsUpper = "CHEST PAIN RADIATING TO ARM";
        var symptomsMixed = "ChEsT PaIn RaDiAtInG tO aRm";

        // Act
        var resultLower = _evaluator.Evaluate(symptomsLower, null, null);
        var resultUpper = _evaluator.Evaluate(symptomsUpper, null, null);
        var resultMixed = _evaluator.Evaluate(symptomsMixed, null, null);

        // Assert
        resultLower.HasRedFlags.Should().BeTrue();
        resultUpper.HasRedFlags.Should().BeTrue();
        resultMixed.HasRedFlags.Should().BeTrue();
    }

    [Fact]
    public void Evaluate_WithMultipleRedFlags_ShouldReturnAll()
    {
        // Arrange
        var symptoms = "chest pain, can't breathe, and severe bleeding";

        // Act
        var result = _evaluator.Evaluate(symptoms, null, null);

        // Assert
        result.HasRedFlags.Should().BeTrue();
        result.RedFlags.Count.Should().BeGreaterOrEqualTo(2);
    }

    #endregion
}
