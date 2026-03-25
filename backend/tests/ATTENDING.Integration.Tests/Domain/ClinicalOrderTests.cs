using FluentAssertions;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using Xunit;

namespace ATTENDING.Integration.Tests.Domain;

public class ClinicalOrderTests
{
    [Fact]
    public void ImagingOrder_Create_ShouldSetDefaults()
    {
        var order = ImagingOrder.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            "71046", "Chest X-Ray", "X-Ray", "Chest", "71046",
            OrderPriority.Routine, "Cough", "R05.9");

        order.OrderNumber.Should().StartWith("IMG-");
        order.Status.Should().Be(ImagingOrderStatus.Pending);
        order.Modality.Should().Be("X-Ray");
    }

    [Fact]
    public void ImagingOrder_Cancel_Completed_ShouldThrow()
    {
        var order = ImagingOrder.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            "71046", "Chest X-Ray", "X-Ray", "Chest", "71046",
            OrderPriority.Routine, "Cough", "R05.9");

        var result = ImagingResult.Create(order.Id, "Normal", "No acute findings");
        order.Complete(result);

        var act = () => order.Cancel();
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void MedicationOrder_Create_ShouldSetDefaults()
    {
        var order = MedicationOrder.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            "RX001", "Amoxicillin", "Amoxicillin", "500mg", "Capsule",
            "Oral", "TID", "500mg", 30, 0,
            "Strep pharyngitis", "J02.0");

        order.OrderNumber.Should().StartWith("RX-");
        order.Status.Should().Be(MedicationOrderStatus.Pending);
        order.IsControlledSubstance.Should().BeFalse();
    }

    [Fact]
    public void Referral_Create_ShouldSetDefaults()
    {
        var referral = Referral.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            "Cardiology", UrgencyLevel.High, "Evaluate murmur", "R01.1");

        referral.ReferralNumber.Should().StartWith("REF-");
        referral.Status.Should().Be(ReferralStatus.Pending);
        referral.Urgency.Should().Be(UrgencyLevel.High);
    }

    [Fact]
    public void Referral_Lifecycle_ShouldProgressCorrectly()
    {
        var referral = Referral.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            "Orthopedics", UrgencyLevel.Standard, "Chronic knee pain", "M25.561");

        referral.MarkAsSent();
        referral.Status.Should().Be(ReferralStatus.Sent);

        referral.Schedule(DateTime.UtcNow.AddDays(14));
        referral.Status.Should().Be(ReferralStatus.Scheduled);

        referral.Complete("Patient seen, recommend PT");
        referral.Status.Should().Be(ReferralStatus.Completed);
        referral.CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public void Encounter_Lifecycle_ShouldProgressCorrectly()
    {
        var encounter = Encounter.Create(Guid.NewGuid(), Guid.NewGuid(), "Office Visit");

        encounter.Status.Should().Be(EncounterStatus.Scheduled);

        encounter.CheckIn();
        encounter.Status.Should().Be(EncounterStatus.CheckedIn);

        encounter.Start("Headache");
        encounter.Status.Should().Be(EncounterStatus.InProgress);
        encounter.ChiefComplaint.Should().Be("Headache");

        encounter.Complete();
        encounter.Status.Should().Be(EncounterStatus.Completed);
    }
}
