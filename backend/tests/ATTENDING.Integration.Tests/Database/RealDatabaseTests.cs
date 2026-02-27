using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Services;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Database;

/// <summary>
/// Tests that run against a real SQL Server container via TestContainers.
/// Validates RowVersion concurrency, soft-delete query filters, and audit interceptor.
/// Requires Docker — skip with: dotnet test --filter "Category!=Docker"
/// </summary>
[Trait("Category", "Docker")]
[Collection("SqlServer")]
public class ConcurrencyTests : IClassFixture<SqlServerFixture>
{
    private readonly SqlServerFixture _fixture;

    public ConcurrencyTests(SqlServerFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task RowVersion_ConcurrentUpdate_ShouldThrowConcurrencyException()
    {
        // Arrange — create a patient
        await using var setupCtx = _fixture.CreateContext();
        var patient = Patient.Create(SqlServerFixture.DefaultTenantId, $"MRN-{Guid.NewGuid():N}"[..12], "Concurrent", "Test",
            new DateTime(1990, 1, 1), BiologicalSex.Female);
        setupCtx.Set<Patient>().Add(patient);
        await setupCtx.SaveChangesAsync();
        var patientId = patient.Id;

        // Act — load the same patient in two separate contexts (simulating two users)
        await using var ctx1 = _fixture.CreateContext();
        await using var ctx2 = _fixture.CreateContext();

        var patient1 = await ctx1.Set<Patient>().FindAsync(patientId);
        var patient2 = await ctx2.Set<Patient>().FindAsync(patientId);

        patient1.Should().NotBeNull();
        patient2.Should().NotBeNull();

        // User 1 saves first — should succeed
        patient1!.SetModified("user1");
        await ctx1.SaveChangesAsync();

        // User 2 tries to save with stale RowVersion — should throw
        patient2!.SetModified("user2");
        var act = () => ctx2.SaveChangesAsync();

        await act.Should().ThrowAsync<DbUpdateConcurrencyException>();
    }

    [Fact]
    public async Task RowVersion_SequentialUpdates_ShouldSucceed()
    {
        // Arrange
        await using var setupCtx = _fixture.CreateContext();
        var patient = Patient.Create(SqlServerFixture.DefaultTenantId, $"MRN-{Guid.NewGuid():N}"[..12], "Sequential", "Test",
            new DateTime(1985, 5, 5), BiologicalSex.Male);
        setupCtx.Set<Patient>().Add(patient);
        await setupCtx.SaveChangesAsync();
        var patientId = patient.Id;

        // Act — load, modify, save, reload, modify, save
        await using var ctx1 = _fixture.CreateContext();
        var p1 = await ctx1.Set<Patient>().FindAsync(patientId);
        p1!.SetModified("user1");
        await ctx1.SaveChangesAsync();

        await using var ctx2 = _fixture.CreateContext();
        var p2 = await ctx2.Set<Patient>().FindAsync(patientId);
        p2!.SetModified("user2");
        await ctx2.SaveChangesAsync(); // Should succeed — fresh RowVersion

        // Assert
        p2.ModifiedBy.Should().Be("user2");
    }

    [Fact]
    public async Task RowVersion_LabOrder_ConcurrentCancel_ShouldThrow()
    {
        // Arrange
        await using var setupCtx = _fixture.CreateContext();
        var patient = await _fixture.SeedPatientAsync(setupCtx, $"MRN-{Guid.NewGuid():N}"[..12]);
        var provider = await _fixture.SeedProviderAsync(setupCtx, $"dr{Guid.NewGuid():N}"[..20] + "@test.ai");
        var encounter = await _fixture.SeedEncounterAsync(setupCtx, patient.Id, provider.Id);

        var labOrder = LabOrder.Create(patient.Id, encounter.Id, provider.Id,
            "CBC", "Complete Blood Count", "85025", "58410-2", "Hematology",
            OrderPriority.Routine, "Fatigue evaluation", "R53.83", false);
        setupCtx.Set<LabOrder>().Add(labOrder);
        await setupCtx.SaveChangesAsync();
        var orderId = labOrder.Id;

        // Act — two contexts load the same order
        await using var ctx1 = _fixture.CreateContext();
        await using var ctx2 = _fixture.CreateContext();

        var order1 = await ctx1.Set<LabOrder>().FindAsync(orderId);
        var order2 = await ctx2.Set<LabOrder>().FindAsync(orderId);

        // User 1 cancels
        order1!.Cancel(provider.Id, "Duplicate order");
        await ctx1.SaveChangesAsync();

        // User 2 tries to cancel with stale RowVersion
        order2!.Cancel(provider.Id, "Patient request");
        var act = () => ctx2.SaveChangesAsync();

        await act.Should().ThrowAsync<DbUpdateConcurrencyException>();
    }
}

[Trait("Category", "Docker")]
[Collection("SqlServer")]
public class SoftDeleteQueryFilterTests : IClassFixture<SqlServerFixture>
{
    private readonly SqlServerFixture _fixture;

    public SoftDeleteQueryFilterTests(SqlServerFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task SoftDeletedPatient_ShouldBeExcludedFromQueries()
    {
        // Arrange
        await using var ctx = _fixture.CreateContext();
        var mrn = $"MRN-{Guid.NewGuid():N}"[..12];
        var patient = Patient.Create(SqlServerFixture.DefaultTenantId, mrn, "Deleted", "Patient", new DateTime(1980, 3, 3), BiologicalSex.Male);
        ctx.Set<Patient>().Add(patient);
        await ctx.SaveChangesAsync();
        var patientId = patient.Id;

        // Act — soft delete
        patient.SoftDelete("admin");
        await ctx.SaveChangesAsync();

        // Assert — standard query should not find it
        await using var queryCtx = _fixture.CreateContext();
        var found = await queryCtx.Set<Patient>().FirstOrDefaultAsync(p => p.Id == patientId);
        found.Should().BeNull("soft-deleted entities should be filtered by global query filter");

        // But IgnoreQueryFilters should find it
        var foundWithFilter = await queryCtx.Set<Patient>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == patientId);
        foundWithFilter.Should().NotBeNull();
        foundWithFilter!.IsDeleted.Should().BeTrue();
        foundWithFilter.DeletedBy.Should().Be("admin");
    }

    [Fact]
    public async Task SoftDeletedAllergy_ShouldBeExcludedFromPatientNavigation()
    {
        // Arrange
        await using var ctx = _fixture.CreateContext();
        var mrn = $"MRN-{Guid.NewGuid():N}"[..12];
        var patient = Patient.Create(SqlServerFixture.DefaultTenantId, mrn, "AllergyTest", "Patient", new DateTime(1975, 7, 7), BiologicalSex.Female);
        ctx.Set<Patient>().Add(patient);
        await ctx.SaveChangesAsync();

        var allergy1 = Allergy.Create(patient.Id, "Penicillin", AllergySeverity.Severe, "Anaphylaxis");
        var allergy2 = Allergy.Create(patient.Id, "Aspirin", AllergySeverity.Mild, "Rash");
        ctx.Set<Allergy>().AddRange(allergy1, allergy2);
        await ctx.SaveChangesAsync();

        // Act — soft delete one allergy
        allergy1.SoftDelete("provider1");
        await ctx.SaveChangesAsync();

        // Assert — loading patient with allergies should only show active ones
        await using var queryCtx = _fixture.CreateContext();
        var loaded = await queryCtx.Set<Patient>()
            .Include(p => p.Allergies)
            .FirstOrDefaultAsync(p => p.Id == patient.Id);

        loaded.Should().NotBeNull();
        loaded!.Allergies.Should().HaveCount(1);
        loaded.Allergies.First().Allergen.Should().Be("Aspirin");
    }

    [Fact]
    public async Task RestoredEntity_ShouldReappearInQueries()
    {
        // Arrange
        await using var ctx = _fixture.CreateContext();
        var mrn = $"MRN-{Guid.NewGuid():N}"[..12];
        var patient = Patient.Create(SqlServerFixture.DefaultTenantId, mrn, "Restore", "Test", new DateTime(1995, 12, 25), BiologicalSex.Male);
        ctx.Set<Patient>().Add(patient);
        await ctx.SaveChangesAsync();
        var patientId = patient.Id;

        // Soft delete
        patient.SoftDelete("admin");
        await ctx.SaveChangesAsync();

        // Verify deleted
        await using var checkCtx = _fixture.CreateContext();
        var deleted = await checkCtx.Set<Patient>().FindAsync(patientId);
        deleted.Should().BeNull();

        // Act — restore
        await using var restoreCtx = _fixture.CreateContext();
        var toRestore = await restoreCtx.Set<Patient>()
            .IgnoreQueryFilters()
            .FirstAsync(p => p.Id == patientId);
        toRestore.Restore();
        await restoreCtx.SaveChangesAsync();

        // Assert — should be visible again
        await using var finalCtx = _fixture.CreateContext();
        var restored = await finalCtx.Set<Patient>().FindAsync(patientId);
        restored.Should().NotBeNull();
        restored!.IsDeleted.Should().BeFalse();
    }
}

[Trait("Category", "Docker")]
[Collection("SqlServer")]
public class AuditInterceptorTests : IClassFixture<SqlServerFixture>
{
    private readonly SqlServerFixture _fixture;

    public AuditInterceptorTests(SqlServerFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Create_ShouldAutoPopulateCreatedBy()
    {
        // Arrange & Act
        await using var ctx = _fixture.CreateContextAsUser("provider-123");
        var patient = Patient.Create(SqlServerFixture.DefaultTenantId, $"MRN-{Guid.NewGuid():N}"[..12], "Audit", "Test",
            new DateTime(1988, 4, 4), BiologicalSex.Female);
        ctx.Set<Patient>().Add(patient);
        await ctx.SaveChangesAsync();

        // Assert
        await using var queryCtx = _fixture.CreateContext();
        var loaded = await queryCtx.Set<Patient>().FindAsync(patient.Id);
        loaded.Should().NotBeNull();
        loaded!.CreatedBy.Should().Be("provider-123");
    }

    [Fact]
    public async Task Update_ShouldAutoPopulateModifiedBy()
    {
        // Arrange — create as user A
        await using var createCtx = _fixture.CreateContextAsUser("userA");
        var patient = Patient.Create(SqlServerFixture.DefaultTenantId, $"MRN-{Guid.NewGuid():N}"[..12], "ModTest", "Patient",
            new DateTime(1992, 8, 8), BiologicalSex.Male);
        createCtx.Set<Patient>().Add(patient);
        await createCtx.SaveChangesAsync();
        var patientId = patient.Id;

        // Act — modify as user B
        await using var modCtx = _fixture.CreateContextAsUser("userB");
        var toModify = await modCtx.Set<Patient>().FindAsync(patientId);
        modCtx.Entry(toModify!).State = EntityState.Modified;
        await modCtx.SaveChangesAsync();

        // Assert
        await using var queryCtx = _fixture.CreateContext();
        var loaded = await queryCtx.Set<Patient>().FindAsync(patientId);
        loaded!.CreatedBy.Should().Be("userA");
        loaded.ModifiedBy.Should().Be("userB");
    }

    [Fact]
    public async Task HardDelete_ShouldBeInterceptedAsSoftDelete()
    {
        // Arrange
        await using var createCtx = _fixture.CreateContextAsUser("creator");
        var patient = Patient.Create(SqlServerFixture.DefaultTenantId, $"MRN-{Guid.NewGuid():N}"[..12], "HardDel", "Test",
            new DateTime(1970, 1, 1), BiologicalSex.Female);
        createCtx.Set<Patient>().Add(patient);
        await createCtx.SaveChangesAsync();
        var patientId = patient.Id;

        // Act — attempt a hard delete (EF Remove)
        await using var deleteCtx = _fixture.CreateContextAsUser("deleter");
        var toDelete = await deleteCtx.Set<Patient>().FindAsync(patientId);
        deleteCtx.Set<Patient>().Remove(toDelete!);
        await deleteCtx.SaveChangesAsync();

        // Assert — should still exist with IsDeleted = true
        await using var queryCtx = _fixture.CreateContext();
        var afterDelete = await queryCtx.Set<Patient>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == patientId);

        afterDelete.Should().NotBeNull("interceptor should convert hard delete to soft delete");
        afterDelete!.IsDeleted.Should().BeTrue();
        afterDelete.DeletedBy.Should().Be("deleter");
        afterDelete.DeletedAt.Should().NotBeNull();

        // Standard query should NOT find it
        var standardQuery = await queryCtx.Set<Patient>().FindAsync(patientId);
        standardQuery.Should().BeNull();
    }
}

/// <summary>
/// Collection definition — shares a single SQL Server container across all test classes
/// </summary>
[CollectionDefinition("SqlServer")]
public class SqlServerCollection : ICollectionFixture<SqlServerFixture>
{
}
