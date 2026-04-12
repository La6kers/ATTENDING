using FluentAssertions;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Services;
using Xunit;

namespace ATTENDING.Integration.Tests.Domain;

public class LabOrderTests
{
    [Fact]
    public void Create_ShouldGenerateOrderNumber()
    {
        var order = LabOrder.Create(
            patientId: Guid.NewGuid(), encounterId: Guid.NewGuid(),
            orderingProviderId: Guid.NewGuid(), testCode: "CBC",
            testName: "Complete Blood Count", cptCode: "85025",
            loincCode: "58410-2", category: "Hematology",
            priority: OrderPriority.Routine,
            clinicalIndication: "Annual physical",
            diagnosisCode: "Z00.00", requiresFasting: false);

        order.Id.Should().NotBeEmpty();
        order.OrderNumber.Should().StartWith("LAB-");
        order.Status.Should().Be(LabOrderStatus.Pending);
        order.Priority.Should().Be(OrderPriority.Routine);
        order.IsStatFromRedFlag.Should().BeFalse();
    }

    [Fact]
    public void Create_WithRedFlag_ShouldUpgradeToStat()
    {
        var evaluator = new RedFlagEvaluator();
        var eval = evaluator.Evaluate("crushing chest pain", null, null);

        var order = LabOrder.Create(
            patientId: Guid.NewGuid(), encounterId: Guid.NewGuid(),
            orderingProviderId: Guid.NewGuid(), testCode: "TROP",
            testName: "Troponin", cptCode: "84484", loincCode: "6598-7",
            category: "Chemistry", priority: OrderPriority.Routine,
            clinicalIndication: "crushing chest pain",
            diagnosisCode: "R07.9", requiresFasting: false,
            redFlagEvaluation: eval);

        order.Priority.Should().Be(OrderPriority.Stat);
        order.IsStatFromRedFlag.Should().BeTrue();
        order.RedFlagReason.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void Cancel_CompletedOrder_ShouldThrow()
    {
        var order = LabOrder.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            "CBC", "Complete Blood Count", "85025", "58410-2",
            "Hematology", OrderPriority.Routine, "Test", "Z00.00", false);

        order.MarkAsCollected(DateTime.UtcNow);
        var result = LabResult.Create(order.Id, "5.0", "K/uL", 4.0m, 11.0m, "Normal", false);
        order.AddResult(result);

        var act = () => order.Cancel(Guid.NewGuid(), "No longer needed");
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void AddResult_Critical_ShouldSetCriticalStatus()
    {
        var order = LabOrder.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            "K", "Potassium", "80051", "6298-4",
            "Chemistry", OrderPriority.Routine, "Hypokalemia", "E87.6", false);

        order.MarkAsCollected(DateTime.UtcNow);
        var result = LabResult.Create(order.Id, "2.5", "mEq/L", 3.5m, 5.0m, "Low", true);
        order.AddResult(result);

        order.Status.Should().Be(LabOrderStatus.CriticalResult);
        order.Result.Should().NotBeNull();
        order.Result!.IsCritical.Should().BeTrue();
    }
}
