using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Data;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Database;

/// <summary>
/// Verifies that multi-tenant isolation enforced by AttendingDbContext global query filters
/// prevents cross-tenant data access. Each test creates data in one tenant and verifies it
/// is invisible from another tenant's context.
///
/// Uses the DatabaseFixture (EF Core InMemory) with explicit tenant IDs to simulate
/// multiple organizations sharing the same database.
/// </summary>
public class MultiTenantIsolationTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;

    /// <summary>Org A — default test tenant</summary>
    private static readonly Guid TenantA = DatabaseFixture.DefaultTenantId;

    /// <summary>Org B — a second, distinct tenant</summary>
    private static readonly Guid TenantB = new("00000000-0000-0000-0000-000000000002");

    public MultiTenantIsolationTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    /// <summary>
    /// Creates a DbContext scoped to the given tenant, simulating a request from that tenant.
    /// Uses the InMemory provider with ICurrentUserService wired to the tenant ID so that
    /// global query filters restrict results to that organization.
    /// </summary>
    private AttendingDbContext CreateTenantContext(Guid tenantId)
    {
        var dbName = $"MultiTenant_{Guid.NewGuid():N}";
        var options = new DbContextOptionsBuilder<AttendingDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        var userService = new TenantScopedUserService(tenantId);
        return new AttendingDbContext(options, domainEventDispatcher: null, currentUserService: userService);
    }

    /// <summary>
    /// Creates a pair of tenant-scoped contexts sharing the same in-memory database,
    /// simulating two tenants accessing the same data store.
    /// </summary>
    private (AttendingDbContext ctxA, AttendingDbContext ctxB) CreateSharedDbTenantContexts()
    {
        var dbName = $"MultiTenant_{Guid.NewGuid():N}";

        var optionsA = new DbContextOptionsBuilder<AttendingDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        var optionsB = new DbContextOptionsBuilder<AttendingDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        var ctxA = new AttendingDbContext(optionsA, domainEventDispatcher: null,
            currentUserService: new TenantScopedUserService(TenantA));
        var ctxB = new AttendingDbContext(optionsB, domainEventDispatcher: null,
            currentUserService: new TenantScopedUserService(TenantB));

        return (ctxA, ctxB);
    }

    [Fact]
    public async Task QueryPatient_FromDifferentTenant_ReturnsEmpty()
    {
        // Arrange — create a patient in Org A
        var (ctxA, ctxB) = CreateSharedDbTenantContexts();
        try
        {
            var patient = Patient.Create(TenantA, "MRN-TENA-001", "Alice", "TenantA",
                new DateTime(1985, 6, 15), BiologicalSex.Female);
            ctxA.Set<Patient>().Add(patient);
            await ctxA.SaveChangesAsync();

            // Act — query from Org B context
            var results = await ctxB.Set<Patient>()
                .Where(p => p.MRN == "MRN-TENA-001")
                .ToListAsync();

            // Assert — Org B should see no patients from Org A
            results.Should().BeEmpty("tenant query filter must prevent cross-tenant data access");
        }
        finally
        {
            await ctxA.DisposeAsync();
            await ctxB.DisposeAsync();
        }
    }

    [Fact]
    public async Task QueryPatientById_FromDifferentTenant_ReturnsNotFound()
    {
        // Arrange — create a patient in Org A, capture its ID
        var (ctxA, ctxB) = CreateSharedDbTenantContexts();
        try
        {
            var patient = Patient.Create(TenantA, "MRN-TENA-002", "Bob", "TenantA",
                new DateTime(1990, 3, 20), BiologicalSex.Male);
            ctxA.Set<Patient>().Add(patient);
            await ctxA.SaveChangesAsync();
            var patientId = patient.Id;

            // Sanity check — Org A can find the patient
            var fromA = await ctxA.Set<Patient>().FirstOrDefaultAsync(p => p.Id == patientId);
            fromA.Should().NotBeNull();

            // Act — direct ID lookup from Org B
            var fromB = await ctxB.Set<Patient>().FirstOrDefaultAsync(p => p.Id == patientId);

            // Assert — Org B must not see Org A's patient even with a known ID
            fromB.Should().BeNull("direct ID lookup must respect tenant isolation");
        }
        finally
        {
            await ctxA.DisposeAsync();
            await ctxB.DisposeAsync();
        }
    }

    [Fact]
    public async Task SoftDeletedPatient_NotVisibleToAnyTenant()
    {
        // Arrange — create a patient in Org A, then soft-delete it
        var ctx = CreateTenantContext(TenantA);
        try
        {
            var patient = Patient.Create(TenantA, "MRN-DEL-001", "Charlie", "Deleted",
                new DateTime(1975, 11, 30), BiologicalSex.Male);
            ctx.Set<Patient>().Add(patient);
            await ctx.SaveChangesAsync();
            var patientId = patient.Id;

            // Soft-delete
            ctx.ChangeTracker.Clear();
            var toDelete = await ctx.Set<Patient>().FindAsync(patientId);
            toDelete!.SoftDelete("admin");
            await ctx.SaveChangesAsync();

            // Act & Assert — not visible to own tenant via standard query
            ctx.ChangeTracker.Clear();
            var fromOwnTenant = await ctx.Set<Patient>().FirstOrDefaultAsync(p => p.Id == patientId);
            fromOwnTenant.Should().BeNull("soft-deleted patient must be filtered out for own tenant");

            // Verify the record still exists when query filters are bypassed (HIPAA retention)
            var withoutFilters = await ctx.Set<Patient>()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == patientId);
            withoutFilters.Should().NotBeNull("soft-deleted record must be retained for HIPAA compliance");
            withoutFilters!.IsDeleted.Should().BeTrue();
            withoutFilters.DeletedBy.Should().Be("admin");
        }
        finally
        {
            await ctx.DisposeAsync();
        }
    }

    [Fact]
    public async Task CreatePatient_AssignedToCurrentTenant()
    {
        // Arrange — context scoped to Tenant B
        var ctx = CreateTenantContext(TenantB);
        try
        {
            // Act — create a patient without explicitly setting OrganizationId;
            // StampAuditFields in AttendingDbContext should auto-assign TenantB
            var patient = Patient.Create(Guid.Empty, "MRN-TENB-001", "Diana", "TenantB",
                new DateTime(2000, 1, 1), BiologicalSex.Female);
            ctx.Set<Patient>().Add(patient);
            await ctx.SaveChangesAsync();

            // Assert — patient should be assigned to the current user's tenant
            ctx.ChangeTracker.Clear();
            var loaded = await ctx.Set<Patient>()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.MRN == "MRN-TENB-001");

            loaded.Should().NotBeNull();
            loaded!.OrganizationId.Should().Be(TenantB,
                "new entities must be auto-assigned to the current user's tenant");
        }
        finally
        {
            await ctx.DisposeAsync();
        }
    }

    [Fact]
    public async Task ConcurrentRequests_DifferentTenants_NoDataLeakage()
    {
        // Arrange — shared database, two tenant contexts
        var dbName = $"MultiTenant_Concurrent_{Guid.NewGuid():N}";

        AttendingDbContext CreateCtx(Guid tenantId)
        {
            var options = new DbContextOptionsBuilder<AttendingDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options;
            return new AttendingDbContext(options, domainEventDispatcher: null,
                currentUserService: new TenantScopedUserService(tenantId));
        }

        // Seed data: 5 patients per tenant
        using (var seedA = CreateCtx(TenantA))
        {
            for (var i = 0; i < 5; i++)
            {
                var p = Patient.Create(TenantA, $"MRN-CA-{i:D3}", $"PatientA{i}", "OrgA",
                    new DateTime(1980 + i, 1, 1), BiologicalSex.Male);
                seedA.Set<Patient>().Add(p);
            }
            await seedA.SaveChangesAsync();
        }

        using (var seedB = CreateCtx(TenantB))
        {
            for (var i = 0; i < 5; i++)
            {
                var p = Patient.Create(TenantB, $"MRN-CB-{i:D3}", $"PatientB{i}", "OrgB",
                    new DateTime(1990 + i, 1, 1), BiologicalSex.Female);
                seedB.Set<Patient>().Add(p);
            }
            await seedB.SaveChangesAsync();
        }

        // Act — parallel queries from both tenants simultaneously
        var taskA = Task.Run(async () =>
        {
            using var ctx = CreateCtx(TenantA);
            return await ctx.Set<Patient>().ToListAsync();
        });

        var taskB = Task.Run(async () =>
        {
            using var ctx = CreateCtx(TenantB);
            return await ctx.Set<Patient>().ToListAsync();
        });

        var results = await Task.WhenAll(taskA, taskB);
        var patientsA = results[0];
        var patientsB = results[1];

        // Assert — each tenant sees only its own data
        patientsA.Should().HaveCount(5, "Tenant A should see exactly 5 patients");
        patientsB.Should().HaveCount(5, "Tenant B should see exactly 5 patients");

        patientsA.Should().OnlyContain(p => p.OrganizationId == TenantA,
            "Tenant A must never see Tenant B's patients");
        patientsB.Should().OnlyContain(p => p.OrganizationId == TenantB,
            "Tenant B must never see Tenant A's patients");

        // Cross-check: no MRN from Org B appears in Org A's results and vice versa
        patientsA.Should().OnlyContain(p => p.MRN.StartsWith("MRN-CA-"));
        patientsB.Should().OnlyContain(p => p.MRN.StartsWith("MRN-CB-"));
    }

    /// <summary>
    /// Minimal ICurrentUserService implementation for tenant-scoped test contexts.
    /// </summary>
    private sealed class TenantScopedUserService : ICurrentUserService
    {
        public TenantScopedUserService(Guid tenantId)
        {
            TenantId = tenantId;
            UserId = tenantId.ToString();
        }

        public string? UserId { get; }
        public string? Email => $"user@tenant-{TenantId}.test";
        public bool IsAuthenticated => true;
        public Guid? TenantId { get; }
    }
}
