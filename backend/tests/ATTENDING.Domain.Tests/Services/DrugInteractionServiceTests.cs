using FluentAssertions;
using ATTENDING.Domain.Services;
using ATTENDING.Domain.ValueObjects;
using Xunit;

namespace ATTENDING.Domain.Tests.Services;

/// <summary>
/// Unit tests for DrugInteractionService
/// </summary>
public class DrugInteractionServiceTests
{
    private readonly DrugInteractionService _service;

    public DrugInteractionServiceTests()
    {
        _service = new DrugInteractionService();
    }

    #region Drug-Drug Interaction Tests

    [Theory]
    [InlineData("Warfarin", "Aspirin")]
    [InlineData("warfarin", "aspirin")] // Case insensitive
    [InlineData("Warfarin", "Ibuprofen")]
    public void CheckInteractions_WithWarfarinAndNsaid_ShouldReturnMajorInteraction(
        string drug1, string drug2)
    {
        // Arrange
        var medications = new List<string> { drug1, drug2 };

        // Act
        var result = _service.CheckInteractions(medications, new List<string>());

        // Assert
        result.HasInteractions.Should().BeTrue();
        result.DrugDrugInteractions.Should().Contain(i => 
            i.Severity == InteractionSeverity.Major);
    }

    [Theory]
    [InlineData("Oxycodone", "Lorazepam")]
    [InlineData("Morphine", "Alprazolam")]
    [InlineData("Hydrocodone", "Diazepam")]
    public void CheckInteractions_WithOpioidAndBenzo_ShouldReturnContraindicated(
        string opioid, string benzo)
    {
        // Arrange
        var medications = new List<string> { opioid, benzo };

        // Act
        var result = _service.CheckInteractions(medications, new List<string>());

        // Assert
        result.HasInteractions.Should().BeTrue();
        result.HasContraindication.Should().BeTrue();
        result.DrugDrugInteractions.Should().Contain(i => 
            i.Severity == InteractionSeverity.Contraindicated);
    }

    [Theory]
    [InlineData("Sertraline", "Tramadol")]
    [InlineData("Fluoxetine", "Linezolid")]
    public void CheckInteractions_WithSsriAndSerotoninergic_ShouldReturnMajorInteraction(
        string ssri, string other)
    {
        // Arrange
        var medications = new List<string> { ssri, other };

        // Act
        var result = _service.CheckInteractions(medications, new List<string>());

        // Assert
        result.HasInteractions.Should().BeTrue();
        result.DrugDrugInteractions.Should().Contain(i =>
            i.Description.Contains("Serotonin", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CheckInteractions_WithNoInteractingDrugs_ShouldReturnEmpty()
    {
        // Arrange
        var medications = new List<string> { "Acetaminophen", "Vitamin D" };

        // Act
        var result = _service.CheckInteractions(medications, new List<string>());

        // Assert
        result.HasInteractions.Should().BeFalse();
        result.DrugDrugInteractions.Should().BeEmpty();
    }

    [Fact]
    public void CheckInteractions_WithMultipleDrugs_ShouldCheckAllCombinations()
    {
        // Arrange - Multiple interacting pairs
        var medications = new List<string> 
        { 
            "Warfarin", "Aspirin", "Digoxin", "Amiodarone" 
        };

        // Act
        var result = _service.CheckInteractions(medications, new List<string>());

        // Assert
        result.HasInteractions.Should().BeTrue();
        result.DrugDrugInteractions.Count.Should().BeGreaterThan(1);
    }

    #endregion

    #region Drug-Allergy Interaction Tests

    [Fact]
    public void CheckInteractions_WithPenicillinAllergyAndAmoxicillin_ShouldReturnContraindicated()
    {
        // Arrange
        var medications = new List<string> { "Amoxicillin" };
        var allergies = new List<string> { "Penicillin" };

        // Act
        var result = _service.CheckInteractions(medications, allergies);

        // Assert
        result.HasInteractions.Should().BeTrue();
        result.HasContraindication.Should().BeTrue();
        result.DrugAllergyInteractions.Should().Contain(i =>
            i.Severity == InteractionSeverity.Contraindicated);
    }

    [Fact]
    public void CheckInteractions_WithSulfonamideAllergyAndSulfamethoxazole_ShouldReturnContraindicated()
    {
        // Arrange
        var medications = new List<string> { "Sulfamethoxazole" };
        var allergies = new List<string> { "Sulfa" };

        // Act
        var result = _service.CheckInteractions(medications, allergies);

        // Assert
        result.HasInteractions.Should().BeTrue();
        result.HasContraindication.Should().BeTrue();
    }

    [Theory]
    [InlineData("Ibuprofen", "Aspirin")]
    [InlineData("Naproxen", "Ibuprofen")]
    public void CheckInteractions_WithNsaidAllergyAndOtherNsaid_ShouldReturnInteraction(
        string medication, string allergy)
    {
        // Arrange
        var medications = new List<string> { medication };
        var allergies = new List<string> { allergy };

        // Act
        var result = _service.CheckInteractions(medications, allergies);

        // Assert
        result.HasInteractions.Should().BeTrue();
        result.DrugAllergyInteractions.Should().NotBeEmpty();
    }

    [Fact]
    public void CheckInteractions_WithNoAllergyMatch_ShouldReturnEmpty()
    {
        // Arrange
        var medications = new List<string> { "Lisinopril" };
        var allergies = new List<string> { "Penicillin" };

        // Act
        var result = _service.CheckInteractions(medications, allergies);

        // Assert
        result.DrugAllergyInteractions.Should().BeEmpty();
    }

    #endregion

    #region Combined Tests

    [Fact]
    public void CheckInteractions_WithBothDrugAndAllergyInteractions_ShouldReturnAll()
    {
        // Arrange
        var medications = new List<string> { "Warfarin", "Aspirin", "Amoxicillin" };
        var allergies = new List<string> { "Penicillin" };

        // Act
        var result = _service.CheckInteractions(medications, allergies);

        // Assert
        result.HasInteractions.Should().BeTrue();
        result.DrugDrugInteractions.Should().NotBeEmpty();
        result.DrugAllergyInteractions.Should().NotBeEmpty();
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void CheckInteractions_WithEmptyMedications_ShouldReturnEmpty()
    {
        // Arrange
        var medications = new List<string>();
        var allergies = new List<string> { "Penicillin" };

        // Act
        var result = _service.CheckInteractions(medications, allergies);

        // Assert
        result.HasInteractions.Should().BeFalse();
    }

    [Fact]
    public void CheckInteractions_WithSingleMedication_ShouldReturnEmpty()
    {
        // Arrange
        var medications = new List<string> { "Warfarin" };
        var allergies = new List<string>();

        // Act
        var result = _service.CheckInteractions(medications, allergies);

        // Assert
        result.DrugDrugInteractions.Should().BeEmpty();
    }

    [Fact]
    public void CheckInteractions_WithNullLists_ShouldHandleGracefully()
    {
        // Act
        var result = _service.CheckInteractions(null!, null!);

        // Assert
        result.Should().NotBeNull();
        result.HasInteractions.Should().BeFalse();
    }

    [Fact]
    public void CheckInteractions_CaseInsensitive_ShouldDetectInteractions()
    {
        // Arrange
        var medicationsLower = new List<string> { "warfarin", "aspirin" };
        var medicationsUpper = new List<string> { "WARFARIN", "ASPIRIN" };

        // Act
        var resultLower = _service.CheckInteractions(medicationsLower, new List<string>());
        var resultUpper = _service.CheckInteractions(medicationsUpper, new List<string>());

        // Assert
        resultLower.HasInteractions.Should().BeTrue();
        resultUpper.HasInteractions.Should().BeTrue();
    }

    #endregion

    #region Severity Priority Tests

    [Fact]
    public void MaxSeverity_WithMultipleInteractions_ShouldReturnHighest()
    {
        // Arrange - Opioid + Benzo (Contraindicated) and Warfarin + Aspirin (Major)
        var medications = new List<string> { "Oxycodone", "Lorazepam", "Warfarin", "Aspirin" };

        // Act
        var result = _service.CheckInteractions(medications, new List<string>());

        // Assert
        result.MaxSeverity.Should().Be(InteractionSeverity.Contraindicated);
    }

    #endregion
}
