using FluentAssertions;
using ATTENDING.Domain.ValueObjects;
using Xunit;

namespace ATTENDING.Domain.Tests.ValueObjects;

/// <summary>
/// Tests for all clinical value objects — ICD-10, CPT, LOINC, NPI, Email, PhoneNumber, typed IDs.
/// Value objects are immutable, validated at creation, and use structural equality.
/// </summary>
public class ValueObjectTests
{
    // ================================================================
    // ICD-10 Code
    // ================================================================

    [Theory]
    [InlineData("J06.9", "Acute upper respiratory infection")]
    [InlineData("E11", "Type 2 diabetes mellitus")]
    [InlineData("I10", "Essential hypertension")]
    [InlineData("M54.5", "Low back pain")]
    public void ICD10Code_ValidFormat_ShouldCreate(string code, string description)
    {
        var icd = ICD10Code.Create(code, description);
        icd.Code.Should().Be(code.ToUpperInvariant());
        icd.Description.Should().Be(description);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void ICD10Code_EmptyOrNull_ShouldThrow(string? code)
    {
        var act = () => ICD10Code.Create(code!);
        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData("INVALID")]
    [InlineData("123")]
    [InlineData("J06.999")]  // Too many decimal digits
    [InlineData("JJ6.9")]   // Two letters
    public void ICD10Code_InvalidFormat_ShouldThrow(string code)
    {
        var act = () => ICD10Code.Create(code);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ICD10Code_CaseNormalization_ShouldUppercase()
    {
        var icd = ICD10Code.Create("j06.9");
        icd.Code.Should().Be("J06.9");
    }

    [Fact]
    public void ICD10Code_ToString_ShouldReturnCode()
    {
        ICD10Code.Create("E11").ToString().Should().Be("E11");
    }

    [Fact]
    public void ICD10Code_Equality_SameCode_ShouldBeEqual()
    {
        var a = ICD10Code.Create("I10", "Hypertension");
        var b = ICD10Code.Create("I10", "Hypertension");
        a.Should().Be(b);
    }

    // ================================================================
    // CPT Code
    // ================================================================

    [Theory]
    [InlineData("99213", "Office visit, established patient")]
    [InlineData("99214", "Office visit, detailed")]
    [InlineData("80053", "Comprehensive metabolic panel")]
    [InlineData("99213-25", "With modifier")]
    public void CPTCode_ValidFormat_ShouldCreate(string code, string description)
    {
        var cpt = CPTCode.Create(code, description);
        cpt.Code.Should().Be(code);
    }

    [Theory]
    [InlineData("")]
    [InlineData("1234")]    // Too short
    [InlineData("123456")]  // Too long
    [InlineData("ABCDE")]   // Not numeric
    public void CPTCode_InvalidFormat_ShouldThrow(string code)
    {
        var act = () => CPTCode.Create(code);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void CPTCode_WithBasePrice_ShouldStore()
    {
        var cpt = CPTCode.Create("99213", "Office visit", 125.00m);
        cpt.BasePrice.Should().Be(125.00m);
    }

    // ================================================================
    // LOINC Code
    // ================================================================

    [Theory]
    [InlineData("2345-7", "Glucose")]
    [InlineData("718-7", "Hemoglobin")]
    [InlineData("14749-6", "Glucose fasting")]
    public void LOINCCode_ValidFormat_ShouldCreate(string code, string description)
    {
        var loinc = LOINCCode.Create(code, description);
        loinc.Code.Should().Be(code);
        loinc.Description.Should().Be(description);
    }

    [Theory]
    [InlineData("")]
    [InlineData("12345")]     // No check digit
    [InlineData("12345-67")]  // Multi-digit check
    [InlineData("ABC-1")]     // Non-numeric
    public void LOINCCode_InvalidFormat_ShouldThrow(string code)
    {
        var act = () => LOINCCode.Create(code);
        act.Should().Throw<ArgumentException>();
    }

    // ================================================================
    // NPI (National Provider Identifier)
    // ================================================================

    [Fact]
    public void NPI_ValidLuhn_ShouldCreate()
    {
        // 1234567893 is a valid NPI with correct Luhn checksum
        var npi = NPI.Create("1234567893");
        npi.Value.Should().Be("1234567893");
    }

    [Fact]
    public void NPI_InvalidLength_ShouldThrow()
    {
        var act = () => NPI.Create("123456");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void NPI_InvalidChecksum_ShouldThrow()
    {
        // 1234567890 has an invalid Luhn checksum
        var act = () => NPI.Create("1234567890");
        act.Should().Throw<ArgumentException>().WithMessage("*checksum*");
    }

    [Fact]
    public void NPI_EmptyOrNull_ShouldThrow()
    {
        ((Action)(() => NPI.Create(""))).Should().Throw<ArgumentException>();
        ((Action)(() => NPI.Create(null!))).Should().Throw<ArgumentException>();
    }

    // ================================================================
    // Email
    // ================================================================

    [Theory]
    [InlineData("doctor@hospital.com")]
    [InlineData("Jane.Doe@clinic.org")]
    [InlineData("user+tag@domain.co.uk")]
    public void Email_ValidFormat_ShouldCreate(string email)
    {
        var e = Email.Create(email);
        e.Value.Should().Be(email.ToLowerInvariant());
    }

    [Fact]
    public void Email_Normalization_ShouldLowercase()
    {
        Email.Create("Doctor@Hospital.COM").Value.Should().Be("doctor@hospital.com");
    }

    [Theory]
    [InlineData("")]
    [InlineData("notanemail")]
    [InlineData("missing@")]
    [InlineData("@nodomain")]
    [InlineData("spaces in@email.com")]
    public void Email_InvalidFormat_ShouldThrow(string email)
    {
        var act = () => Email.Create(email);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Email_Equality_SameLowercase_ShouldBeEqual()
    {
        Email.Create("A@B.COM").Should().Be(Email.Create("a@b.com"));
    }

    // ================================================================
    // PhoneNumber
    // ================================================================

    [Theory]
    [InlineData("(303) 555-0100", "3035550100", "(303) 555-0100")]
    [InlineData("303-555-0100", "3035550100", "(303) 555-0100")]
    [InlineData("3035550100", "3035550100", "(303) 555-0100")]
    [InlineData("1-303-555-0100", "3035550100", "(303) 555-0100")]
    [InlineData("+1 303 555 0100", "3035550100", "(303) 555-0100")]
    public void PhoneNumber_VariousFormats_ShouldNormalize(
        string input, string expectedRaw, string expectedFormatted)
    {
        var phone = PhoneNumber.Create(input);
        phone.Value.Should().Be(expectedRaw);
        phone.Formatted.Should().Be(expectedFormatted);
    }

    [Theory]
    [InlineData("")]
    [InlineData("123")]           // Too short
    [InlineData("123456789012")]  // Too long
    public void PhoneNumber_InvalidLength_ShouldThrow(string input)
    {
        var act = () => PhoneNumber.Create(input);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void PhoneNumber_ToString_ShouldReturnFormatted()
    {
        PhoneNumber.Create("3035550100").ToString().Should().Be("(303) 555-0100");
    }

    // ================================================================
    // Typed IDs
    // ================================================================

    [Fact]
    public void PatientId_Create_ShouldGenerateUniqueIds()
    {
        var id1 = PatientId.Create();
        var id2 = PatientId.Create();
        id1.Should().NotBe(id2);
    }

    [Fact]
    public void PatientId_From_ShouldWrapGuid()
    {
        var guid = Guid.NewGuid();
        var id = PatientId.From(guid);
        ((Guid)id).Should().Be(guid);
    }

    [Fact]
    public void PatientId_FromString_ShouldParse()
    {
        var guid = Guid.NewGuid();
        var id = PatientId.From(guid.ToString());
        id.Value.Should().Be(guid);
    }

    [Fact]
    public void PatientId_ImplicitGuidConversion()
    {
        var id = PatientId.Create();
        Guid guid = id;
        guid.Should().Be(id.Value);
    }

    [Fact]
    public void UserId_Create_ShouldWork()
    {
        var id = UserId.Create();
        id.Value.Should().NotBeEmpty();
    }

    [Fact]
    public void EncounterId_RoundTrip()
    {
        var guid = Guid.NewGuid();
        var id = EncounterId.From(guid);
        id.ToString().Should().Be(guid.ToString());
    }

    [Fact]
    public void LabOrderId_Equality()
    {
        var guid = Guid.NewGuid();
        LabOrderId.From(guid).Should().Be(LabOrderId.From(guid));
    }
}
