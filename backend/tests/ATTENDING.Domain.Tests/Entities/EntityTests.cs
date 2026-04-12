using FluentAssertions;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;
using ATTENDING.Domain.Services;
using Xunit;

namespace ATTENDING.Domain.Tests.Entities;

/// <summary>
/// Tests for BaseEntity enterprise capabilities: audit fields, soft delete, concurrency.
/// </summary>
public class BaseEntityTests
{
    // Use a concrete subclass to test BaseEntity behavior
    private static readonly Guid _testTenantId = new("00000000-0000-0000-0000-000000000001");
    private static Patient CreateTestPatient() =>
        Patient.Create(_testTenantId, "MRN-001", "John", "Doe", new DateTime(1990, 1, 15), BiologicalSex.Male);

    [Fact]
    public void Create_ShouldSetCreatedAt()
    {
        var before = DateTime.UtcNow;
        var patient = CreateTestPatient();
        patient.CreatedAt.Should().BeOnOrAfter(before);
    }

    [Fact]
    public void SetModified_ShouldUpdateTimestamp()
    {
        var patient = CreateTestPatient();
        var original = patient.ModifiedAt;

        patient.SetModified();

        patient.ModifiedAt.Should().NotBeNull();
        patient.ModifiedAt.Should().BeAfter(patient.CreatedAt.AddMilliseconds(-1));
    }

    [Fact]
    public void SetModified_WithUserId_ShouldTrackUser()
    {
        var patient = CreateTestPatient();

        patient.SetModified("user-123");

        patient.ModifiedBy.Should().Be("user-123");
    }

    [Fact]
    public void SetCreatedBy_ShouldTrackCreator()
    {
        var patient = CreateTestPatient();

        patient.SetCreatedBy("provider-456");

        patient.CreatedBy.Should().Be("provider-456");
    }

    [Fact]
    public void SoftDelete_ShouldMarkAsDeleted()
    {
        var patient = CreateTestPatient();

        patient.SoftDelete("admin-789");

        patient.IsDeleted.Should().BeTrue();
        patient.DeletedAt.Should().NotBeNull();
        patient.DeletedBy.Should().Be("admin-789");
    }

    [Fact]
    public void SoftDelete_WithoutUserId_ShouldStillMarkDeleted()
    {
        var patient = CreateTestPatient();

        patient.SoftDelete();

        patient.IsDeleted.Should().BeTrue();
        patient.DeletedBy.Should().BeNull();
    }

    [Fact]
    public void Restore_ShouldClearDeleteFields()
    {
        var patient = CreateTestPatient();
        patient.SoftDelete("admin");

        patient.Restore();

        patient.IsDeleted.Should().BeFalse();
        patient.DeletedAt.Should().BeNull();
        patient.DeletedBy.Should().BeNull();
    }

    [Fact]
    public void NewEntity_ShouldNotBeDeleted()
    {
        var patient = CreateTestPatient();

        patient.IsDeleted.Should().BeFalse();
        patient.DeletedAt.Should().BeNull();
    }

    [Fact]
    public void RowVersion_ShouldDefaultToEmpty()
    {
        var patient = CreateTestPatient();
        patient.RowVersion.Should().BeEmpty();
    }
}

/// <summary>
/// Tests for Patient aggregate root
/// </summary>
public class PatientEntityTests
{
    [Fact]
    public void Create_WithValidData_ShouldSetAllFields()
    {
        var tenantId = new Guid("00000000-0000-0000-0000-000000000001");
        var patient = Patient.Create(tenantId, "MRN-2026-001", "Jane", "Smith",
            new DateTime(1985, 6, 15), BiologicalSex.Female);

        patient.Id.Should().NotBeEmpty();
        patient.MRN.Should().Be("MRN-2026-001");
        patient.FirstName.Should().Be("Jane");
        patient.LastName.Should().Be("Smith");
        patient.DateOfBirth.Should().Be(new DateTime(1985, 6, 15));
        patient.Sex.Should().Be(BiologicalSex.Female);
        patient.IsActive.Should().BeTrue();
        patient.PrimaryLanguage.Should().Be("English");
    }

    [Fact]
    public void FullName_ShouldConcatenateNames()
    {
        var tenantId = new Guid("00000000-0000-0000-0000-000000000001");
        var patient = Patient.Create(tenantId, "MRN-001", "John", "Doe",
            new DateTime(1990, 1, 1), BiologicalSex.Male);

        patient.FullName.Should().Be("John Doe");
    }

    [Fact]
    public void Age_ShouldCalculateCorrectly()
    {
        var tenantId = new Guid("00000000-0000-0000-0000-000000000001");
        var birthDate = DateTime.Today.AddYears(-35);
        var patient = Patient.Create(tenantId, "MRN-001", "Test", "Patient", birthDate, BiologicalSex.Male);

        patient.Age.Should().Be(35);
    }

    [Fact]
    public void Age_BirthdayNotYetThisYear_ShouldBeOneYearLess()
    {
        // Birthday is tomorrow — hasn't turned the age yet
        var tenantId = new Guid("00000000-0000-0000-0000-000000000001");
        var birthDate = DateTime.Today.AddYears(-30).AddDays(1);
        var patient = Patient.Create(tenantId, "MRN-001", "Test", "Patient", birthDate, BiologicalSex.Male);

        patient.Age.Should().Be(29);
    }

    [Fact]
    public void Create_ShouldGenerateUniqueIds()
    {
        var tenantId = new Guid("00000000-0000-0000-0000-000000000001");
        var p1 = Patient.Create(tenantId, "MRN-001", "A", "B", DateTime.Today, BiologicalSex.Male);
        var p2 = Patient.Create(tenantId, "MRN-002", "C", "D", DateTime.Today, BiologicalSex.Female);

        p1.Id.Should().NotBe(p2.Id);
    }

    [Fact]
    public void Collections_ShouldInitializeEmpty()
    {
        var tenantId = new Guid("00000000-0000-0000-0000-000000000001");
        var patient = Patient.Create(tenantId, "MRN-001", "Test", "Patient",
            DateTime.Today.AddYears(-30), BiologicalSex.Male);

        patient.Encounters.Should().BeEmpty();
        patient.LabOrders.Should().BeEmpty();
        patient.Allergies.Should().BeEmpty();
        patient.Conditions.Should().BeEmpty();
    }
}

/// <summary>
/// Tests for User entity
/// </summary>
public class UserEntityTests
{
    [Fact]
    public void Create_WithValidData_ShouldSetAllFields()
    {
        var user = User.Create("doc@hospital.com", "Scott", "Isbell",
            UserRole.Provider, "1234567893", "Family Medicine");

        user.Id.Should().NotBeEmpty();
        user.Email.Should().Be("doc@hospital.com");
        user.FirstName.Should().Be("Scott");
        user.LastName.Should().Be("Isbell");
        user.Role.Should().Be(UserRole.Provider);
        user.NPI.Should().Be("1234567893");
        user.Specialty.Should().Be("Family Medicine");
        user.IsActive.Should().BeTrue();
    }

    [Fact]
    public void Create_WithoutOptionals_ShouldHaveNullNpiAndSpecialty()
    {
        var user = User.Create("nurse@hospital.com", "Jane", "Nurse", UserRole.Nurse);

        user.NPI.Should().BeNull();
        user.Specialty.Should().BeNull();
    }

    [Fact]
    public void FullName_ShouldConcatenate()
    {
        var user = User.Create("a@b.com", "First", "Last", UserRole.Staff);
        user.FullName.Should().Be("First Last");
    }
}

/// <summary>
/// Tests for Encounter lifecycle state machine
/// </summary>
public class EncounterEntityTests
{
    private static Encounter CreateTestEncounter() =>
        Encounter.Create(Guid.NewGuid(), Guid.NewGuid(), "Office Visit");

    [Fact]
    public void Create_ShouldSetScheduledStatus()
    {
        var encounter = CreateTestEncounter();

        encounter.Status.Should().Be(EncounterStatus.Scheduled);
        encounter.EncounterNumber.Should().StartWith("ENC-");
    }

    [Fact]
    public void Create_WithScheduledAt_ShouldSetTime()
    {
        var scheduled = DateTime.UtcNow.AddHours(2);
        var encounter = Encounter.Create(Guid.NewGuid(), Guid.NewGuid(), "Office Visit", scheduled);

        encounter.ScheduledAt.Should().Be(scheduled);
    }

    [Fact]
    public void CheckIn_ShouldUpdateStatusAndTimestamp()
    {
        var encounter = CreateTestEncounter();

        encounter.CheckIn();

        encounter.Status.Should().Be(EncounterStatus.CheckedIn);
        encounter.CheckedInAt.Should().NotBeNull();
    }

    [Fact]
    public void Start_ShouldSetInProgressAndChiefComplaint()
    {
        var encounter = CreateTestEncounter();
        encounter.CheckIn();

        encounter.Start("Chest pain");

        encounter.Status.Should().Be(EncounterStatus.InProgress);
        encounter.StartedAt.Should().NotBeNull();
        encounter.ChiefComplaint.Should().Be("Chest pain");
    }

    [Fact]
    public void Complete_ShouldSetCompletedStatusAndTimestamp()
    {
        var encounter = CreateTestEncounter();
        encounter.CheckIn();
        encounter.Start("Follow-up");

        encounter.Complete();

        encounter.Status.Should().Be(EncounterStatus.Completed);
        encounter.CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public void FullLifecycle_ShouldProgressCorrectly()
    {
        var encounter = CreateTestEncounter();

        encounter.Status.Should().Be(EncounterStatus.Scheduled);

        encounter.CheckIn();
        encounter.Status.Should().Be(EncounterStatus.CheckedIn);

        encounter.Start("Headache");
        encounter.Status.Should().Be(EncounterStatus.InProgress);

        encounter.Complete();
        encounter.Status.Should().Be(EncounterStatus.Completed);

        encounter.CompletedAt.Should().BeAfter(encounter.StartedAt!.Value);
        encounter.StartedAt.Should().BeAfter(encounter.CheckedInAt!.Value);
    }

    [Fact]
    public void Create_ShouldGenerateUniqueEncounterNumbers()
    {
        var e1 = CreateTestEncounter();
        var e2 = CreateTestEncounter();

        e1.EncounterNumber.Should().NotBe(e2.EncounterNumber);
    }
}

/// <summary>
/// Tests for Allergy entity
/// </summary>
public class AllergyEntityTests
{
    [Fact]
    public void Create_WithValidData_ShouldSetAllFields()
    {
        var patientId = Guid.NewGuid();
        var allergy = Allergy.Create(patientId, "Penicillin", AllergySeverity.Severe, "Anaphylaxis");

        allergy.Id.Should().NotBeEmpty();
        allergy.PatientId.Should().Be(patientId);
        allergy.Allergen.Should().Be("Penicillin");
        allergy.Severity.Should().Be(AllergySeverity.Severe);
        allergy.Reaction.Should().Be("Anaphylaxis");
        allergy.IsActive.Should().BeTrue();
    }

    [Fact]
    public void Create_WithoutReaction_ShouldBeNull()
    {
        var allergy = Allergy.Create(Guid.NewGuid(), "Peanuts", AllergySeverity.LifeThreatening);
        allergy.Reaction.Should().BeNull();
    }
}

/// <summary>
/// Tests for MedicalCondition entity
/// </summary>
public class MedicalConditionEntityTests
{
    [Fact]
    public void Create_WithValidData_ShouldSetAllFields()
    {
        var patientId = Guid.NewGuid();
        var condition = MedicalCondition.Create(patientId, "E11", "Type 2 Diabetes",
            new DateTime(2020, 3, 15));

        condition.Id.Should().NotBeEmpty();
        condition.PatientId.Should().Be(patientId);
        condition.Code.Should().Be("E11");
        condition.Name.Should().Be("Type 2 Diabetes");
        condition.OnsetDate.Should().Be(new DateTime(2020, 3, 15));
        condition.IsActive.Should().BeTrue();
    }

    [Fact]
    public void Create_WithoutOnsetDate_ShouldBeNull()
    {
        var condition = MedicalCondition.Create(Guid.NewGuid(), "I10", "Hypertension");
        condition.OnsetDate.Should().BeNull();
    }
}

/// <summary>
/// Tests for LabOrder aggregate root — creation, lifecycle, red flags, domain events
/// </summary>
public class LabOrderEntityTests
{
    private static LabOrder CreateTestLabOrder(RedFlagEvaluation? redFlagEval = null) =>
        LabOrder.Create(
            patientId: Guid.NewGuid(),
            encounterId: Guid.NewGuid(),
            orderingProviderId: Guid.NewGuid(),
            testCode: "BMP",
            testName: "Basic Metabolic Panel",
            cptCode: "80048",
            loincCode: "2345-7",
            category: "Chemistry",
            priority: OrderPriority.Routine,
            clinicalIndication: "Annual screening",
            diagnosisCode: "Z00.00",
            requiresFasting: true,
            redFlagEvaluation: redFlagEval);

    [Fact]
    public void Create_WithValidData_ShouldSetAllFields()
    {
        var order = CreateTestLabOrder();

        order.Id.Should().NotBeEmpty();
        order.OrderNumber.Should().StartWith("LAB-");
        order.TestCode.Should().Be("BMP");
        order.Status.Should().Be(LabOrderStatus.Pending);
        order.Priority.Should().Be(OrderPriority.Routine);
        order.RequiresFasting.Should().BeTrue();
        order.IsStatFromRedFlag.Should().BeFalse();
    }

    [Fact]
    public void Create_ShouldRaiseDomainEvent()
    {
        var order = CreateTestLabOrder();

        order.DomainEvents.Should().ContainSingle()
            .Which.Should().BeOfType<LabOrderCreatedEvent>();
    }

    [Fact]
    public void Create_WithRedFlag_ShouldUpgradeToStat()
    {
        var redFlag = new RedFlagEvaluation(
            RedFlags: new[] { new DetectedRedFlag("Cardiovascular", "chest pain", RedFlagSeverity.Critical, "Chest pain detected") },
            HasRedFlags: true,
            IsEmergency: false,
            Reason: "Chest pain detected");

        var order = CreateTestLabOrder(redFlag);

        order.Priority.Should().Be(OrderPriority.Stat);
        order.IsStatFromRedFlag.Should().BeTrue();
        order.RedFlagReason.Should().Be("Chest pain detected");
    }

    [Fact]
    public void Create_EmptyTestCode_ShouldThrow()
    {
        var act = () => LabOrder.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            "", "Test", "80048", "2345-7", "Chem",
            OrderPriority.Routine, "Indication", "Z00.00", false);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_EmptyClinicalIndication_ShouldThrow()
    {
        var act = () => LabOrder.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            "BMP", "Test", "80048", "2345-7", "Chem",
            OrderPriority.Routine, "", "Z00.00", false);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void MarkAsCollected_FromPending_ShouldSucceed()
    {
        var order = CreateTestLabOrder();
        var collectedAt = DateTime.UtcNow;

        order.MarkAsCollected(collectedAt);

        order.Status.Should().Be(LabOrderStatus.Collected);
        order.CollectedAt.Should().Be(collectedAt);
    }

    [Fact]
    public void MarkAsCollected_FromNonPending_ShouldThrow()
    {
        var order = CreateTestLabOrder();
        order.MarkAsCollected(DateTime.UtcNow);

        var act = () => order.MarkAsCollected(DateTime.UtcNow);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void AddResult_Normal_ShouldSetResultedStatus()
    {
        var order = CreateTestLabOrder();
        order.MarkAsCollected(DateTime.UtcNow);
        var result = LabResult.Create(order.Id, "95", "mg/dL", 70, 100, "Normal");

        order.AddResult(result);

        order.Status.Should().Be(LabOrderStatus.Resulted);
        order.ResultedAt.Should().NotBeNull();
    }

    [Fact]
    public void AddResult_Critical_ShouldSetCriticalStatus()
    {
        var order = CreateTestLabOrder();
        order.MarkAsCollected(DateTime.UtcNow);
        var result = LabResult.Create(order.Id, "30", "mg/dL", 70, 100, "Critical Low",
            isCritical: true);

        order.AddResult(result);

        order.Status.Should().Be(LabOrderStatus.CriticalResult);
    }

    [Fact]
    public void Cancel_PendingOrder_ShouldSucceed()
    {
        var order = CreateTestLabOrder();
        var cancelledBy = Guid.NewGuid();

        order.Cancel(cancelledBy, "Patient declined");

        order.Status.Should().Be(LabOrderStatus.Cancelled);
        order.LastModifiedBy.Should().Be(cancelledBy);
    }

    [Fact]
    public void Cancel_CollectedOrder_ShouldThrow()
    {
        var order = CreateTestLabOrder();
        order.MarkAsCollected(DateTime.UtcNow);

        var act = () => order.Cancel(Guid.NewGuid(), "Too late");
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void UpdatePriority_PendingOrder_ShouldSucceed()
    {
        var order = CreateTestLabOrder();
        var modifiedBy = Guid.NewGuid();

        order.UpdatePriority(OrderPriority.Urgent, modifiedBy);

        order.Priority.Should().Be(OrderPriority.Urgent);
        order.LastModifiedBy.Should().Be(modifiedBy);
    }

    [Fact]
    public void UpdatePriority_NonPendingOrder_ShouldThrow()
    {
        var order = CreateTestLabOrder();
        order.MarkAsCollected(DateTime.UtcNow);

        var act = () => order.UpdatePriority(OrderPriority.Stat, Guid.NewGuid());
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void ClearDomainEvents_ShouldRemoveAllEvents()
    {
        var order = CreateTestLabOrder();
        order.DomainEvents.Should().NotBeEmpty();

        order.ClearDomainEvents();

        order.DomainEvents.Should().BeEmpty();
    }

    [Fact]
    public void FullLifecycle_ShouldTrackAllDomainEvents()
    {
        var order = CreateTestLabOrder();
        order.ClearDomainEvents();

        order.MarkAsCollected(DateTime.UtcNow);
        order.AddResult(LabResult.Create(order.Id, "100", "mg/dL", isCritical: true));

        order.DomainEvents.Should().HaveCount(2);
        order.DomainEvents.Should().ContainSingle(e => e is LabOrderCollectedEvent);
        order.DomainEvents.Should().ContainSingle(e => e is LabOrderResultedEvent);
    }
}

/// <summary>
/// Tests for LabResult entity
/// </summary>
public class LabResultEntityTests
{
    [Fact]
    public void Create_WithAllFields_ShouldSetCorrectly()
    {
        var orderId = Guid.NewGuid();
        var result = LabResult.Create(orderId, "95", "mg/dL", 70, 100,
            "Normal", false, "Quest Diagnostics", "Lab Tech 1", "Fasting specimen");

        result.Id.Should().NotBeEmpty();
        result.LabOrderId.Should().Be(orderId);
        result.Value.Should().Be("95");
        result.Unit.Should().Be("mg/dL");
        result.ReferenceRangeLow.Should().Be(70);
        result.ReferenceRangeHigh.Should().Be(100);
        result.Interpretation.Should().Be("Normal");
        result.IsCritical.Should().BeFalse();
        result.PerformingLab.Should().Be("Quest Diagnostics");
        result.Comments.Should().Be("Fasting specimen");
    }

    [Fact]
    public void MarkCriticalNotified_ShouldSetNotificationFields()
    {
        var result = LabResult.Create(Guid.NewGuid(), "30", "mg/dL", isCritical: true);
        var notifiedTo = Guid.NewGuid();

        result.MarkCriticalNotified(notifiedTo);

        result.CriticalNotifiedAt.Should().NotBeNull();
        result.CriticalNotifiedTo.Should().Be(notifiedTo);
    }
}

/// <summary>
/// Tests for PatientAssessment lifecycle and COMPASS flow
/// </summary>
public class PatientAssessmentEntityTests
{
    [Fact]
    public void Create_ShouldSetInitialState()
    {
        var patientId = Guid.NewGuid();
        var assessment = PatientAssessment.Create(patientId, "Headache");

        assessment.Id.Should().NotBeEmpty();
        assessment.AssessmentNumber.Should().StartWith("ASM-");
        assessment.PatientId.Should().Be(patientId);
        assessment.ChiefComplaint.Should().Be("Headache");
        assessment.CurrentPhase.Should().Be(AssessmentPhase.ChiefComplaint);
        assessment.IsEmergency.Should().BeFalse();
    }

    [Fact]
    public void Create_ShouldRaiseStartedEvent()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Cough");

        assessment.DomainEvents.Should().ContainSingle()
            .Which.Should().BeOfType<AssessmentStartedEvent>();
    }

    [Fact]
    public void Create_WithEmergencyRedFlag_ShouldTriggerEmergency()
    {
        var redFlag = new RedFlagEvaluation(
            RedFlags: new[] { new DetectedRedFlag("Cardiovascular", "crushing chest pain", RedFlagSeverity.Critical, "Possible ACS") },
            HasRedFlags: true,
            IsEmergency: true,
            Reason: "Chest pain with SOB");

        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Crushing chest pain", redFlag);

        assessment.IsEmergency.Should().BeTrue();
        assessment.EmergencyReason.Should().Contain("Chest pain");
        assessment.CurrentPhase.Should().Be(AssessmentPhase.Emergency);
    }

    [Fact]
    public void SetPainSeverity_ValidRange_ShouldSet()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Back pain");

        assessment.SetPainSeverity(7);

        assessment.PainSeverity.Should().Be(7);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(11)]
    [InlineData(100)]
    public void SetPainSeverity_OutOfRange_ShouldThrow(int severity)
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Pain");

        var act = () => assessment.SetPainSeverity(severity);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Complete_ShouldSetTriageLevelAndPhase()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Follow-up");

        assessment.Complete(TriageLevel.LessUrgent);

        assessment.CurrentPhase.Should().Be(AssessmentPhase.Completed);
        assessment.CompletedAt.Should().NotBeNull();
        assessment.TriageLevel.Should().Be(TriageLevel.LessUrgent);
    }

    [Fact]
    public void MarkAsReviewed_ShouldSetProvider()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Rash");
        var providerId = Guid.NewGuid();

        assessment.MarkAsReviewed(providerId);

        assessment.ReviewedByProviderId.Should().Be(providerId);
        assessment.ReviewedAt.Should().NotBeNull();
    }

    [Fact]
    public void AdvancePhase_ShouldUpdateCurrentPhase()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Headache");

        assessment.AdvancePhase(AssessmentPhase.HpiOnset);

        assessment.CurrentPhase.Should().Be(AssessmentPhase.HpiOnset);
    }

    [Fact]
    public void SetHpiData_ShouldPopulateFields()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Pain");

        assessment.SetHpiData(
            onset: "2 days ago",
            location: "Lower back",
            duration: "Constant",
            character: "Sharp",
            severity: "8/10");

        assessment.HpiOnset.Should().Be("2 days ago");
        assessment.HpiLocation.Should().Be("Lower back");
        assessment.HpiDuration.Should().Be("Constant");
        assessment.HpiCharacter.Should().Be("Sharp");
        assessment.HpiSeverity.Should().Be("8/10");
    }

    [Fact]
    public void LinkToEncounter_ShouldSetEncounterId()
    {
        var assessment = PatientAssessment.Create(Guid.NewGuid(), "Test");
        var encounterId = Guid.NewGuid();

        assessment.LinkToEncounter(encounterId);

        assessment.EncounterId.Should().Be(encounterId);
    }
}
