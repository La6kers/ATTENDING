using FluentAssertions;
using ATTENDING.Domain.Services;
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
        // Act
        var result = _service.CheckInteractions(drug1, new List<string> { drug2 });

        // Assert
        result.HasInteractions.Should().BeTrue();
        result.Interactions.Should().Contain(i => 
            i.Severity == InteractionSeverity.Major);
    }

    [Theory]
    [InlineData("Lorazepam", "Oxycodone")]
    [InlineData("Alprazolam", "Morphine")]
    public void CheckInteractions_WithOpioidAndBenzo_ShouldReturnMajorInteraction(
        string benzo, string opioid)
    {
        // Act
        var result = _service.CheckInteractions(benzo, new List<string> { opioid });

        // Assert
        result.HasInteractions.Should().BeTrue();
        result.HasMajorInteractions.Should().BeTrue();
        result.Interactions.Should().Contain(i => 
            i.Severity == InteractionSeverity.Major);
    }

    [Theory]
    [InlineData("Tramadol", "Fluoxetine")]
    [InlineData("Linezolid", "Fluoxetine")]
    public void CheckInteractions_WithSsriAndSerotoninergic_ShouldReturnInteraction(
        string newDrug, string currentDrug)
    {
        // Act
        var result = _service.CheckInteractions(newDrug, new List<string> { currentDrug });

        // Assert
        result.HasInteractions.Should().BeTrue();
    }

    [Fact]
    public void CheckInteractions_WithNoInteractingDrugs_ShouldReturnEmpty()
    {
        // Act
        var result = _service.CheckInteractions("Acetaminophen", new List<string> { "Vitamin D" });

        // Assert
        result.HasInteractions.Should().BeFalse();
        result.Interactions.Should().BeEmpty();
    }

    [Fact]
    public void CheckInteractions_WithMultipleDrugs_ShouldCheckAllCombinations()
    {
        // Arrange - Warfarin against multiple interacting drugs
        var currentMeds = new List<string> { "Aspirin", "Ibuprofen", "Amiodarone" };

        // Act
        var result = _service.CheckInteractions("Warfarin", currentMeds);

        // Assert
        result.HasInteractions.Should().BeTrue();
        result.Interactions.Count.Should().BeGreaterThan(1);
    }

    #endregion

    #region Drug-Allergy Interaction Tests

    [Fact]
    public void CheckAllergyConflicts_WithPenicillinAllergyAndAmoxicillin_ShouldReturnInteraction()
    {
        // Act
        var result = _service.CheckAllergyConflicts("Amoxicillin", new List<string> { "Penicillin" });

        // Assert
        result.HasInteractions.Should().BeTrue();
        result.Interactions.Should().NotBeEmpty();
    }

    [Fact]
    public void CheckAllergyConflicts_WithSulfonamideAllergyAndSulfamethoxazole_ShouldReturnInteraction()
    {
        // Act
        var result = _service.CheckAllergyConflicts("Sulfamethoxazole", new List<string> { "Sulfa" });

        // Assert
        result.HasInteractions.Should().BeTrue();
    }

    [Theory]
    [InlineData("Ibuprofen", "Aspirin")]
    [InlineData("Naproxen", "Ibuprofen")]
    public void CheckAllergyConflicts_WithNsaidAllergyAndOtherNsaid_ShouldReturnInteraction(
        string medication, string allergy)
    {
        // Act
        var result = _service.CheckAllergyConflicts(medication, new List<string> { allergy });

        // Assert
        result.HasInteractions.Should().BeTrue();
    }

    [Fact]
    public void CheckAllergyConflicts_WithNoAllergyMatch_ShouldReturnEmpty()
    {
        // Act
        var result = _service.CheckAllergyConflicts("Lisinopril", new List<string> { "Penicillin" });

        // Assert
        result.HasInteractions.Should().BeFalse();
    }

    #endregion

    #region Combined Tests

    [Fact]
    public void CheckInteractions_AndAllergyConflicts_ShouldBothWork()
    {
        // Drug-drug
        var drugResult = _service.CheckInteractions("Aspirin", new List<string> { "Warfarin" });
        drugResult.HasInteractions.Should().BeTrue();
        drugResult.Interactions.Should().NotBeEmpty();

        // Drug-allergy
        var allergyResult = _service.CheckAllergyConflicts("Amoxicillin", new List<string> { "Penicillin" });
        allergyResult.HasInteractions.Should().BeTrue();
        allergyResult.Interactions.Should().NotBeEmpty();
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void CheckInteractions_WithEmptyCurrentMeds_ShouldReturnEmpty()
    {
        // Act
        var result = _service.CheckInteractions("Warfarin", new List<string>());

        // Assert
        result.HasInteractions.Should().BeFalse();
    }

    [Fact]
    public void CheckInteractions_CaseInsensitive_ShouldDetectInteractions()
    {
        // Act
        var resultLower = _service.CheckInteractions("warfarin", new List<string> { "aspirin" });
        var resultUpper = _service.CheckInteractions("WARFARIN", new List<string> { "ASPIRIN" });

        // Assert
        resultLower.HasInteractions.Should().BeTrue();
        resultUpper.HasInteractions.Should().BeTrue();
    }

    #endregion

    #region Severity Tests

    [Fact]
    public void CheckInteractions_ContraindicatedPair_ShouldFlagContraindication()
    {
        // Fluoxetine + Linezolid is contraindicated
        var result = _service.CheckInteractions("Linezolid", new List<string> { "Fluoxetine" });

        // Assert
        result.HasInteractions.Should().BeTrue();
        result.HasContraindications.Should().BeTrue();
    }

    #endregion
}
