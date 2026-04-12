using Microsoft.EntityFrameworkCore;
using Testcontainers.MsSql;
using Xunit;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Data;

namespace ATTENDING.Integration.Tests.Fixtures;

/// <summary>
/// Spins up a real SQL Server container via TestContainers.
/// Applies migrations, provides a fresh DbContext per test.
/// Requires Docker to be running.
/// </summary>
public class SqlServerFixture : IAsyncLifetime
{
    private readonly MsSqlContainer _container;
    private string _connectionString = string.Empty;

    public SqlServerFixture()
    {
        _container = new MsSqlBuilder()
            .WithImage("mcr.microsoft.com/mssql/server:2019-latest")
            .Build();
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        _connectionString = _container.GetConnectionString();

        // Apply migrations to set up the schema
        await using var context = CreateContext();
        await context.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _container.DisposeAsync();
    }

    public AttendingDbContext CreateContext(ICurrentUserService? userService = null)
    {
        if (userService != null)
        {
            var interceptor = new AuditSaveChangesInterceptor(userService);
            var optionsWithInterceptor = new DbContextOptionsBuilder<AttendingDbContext>()
                .UseSqlServer(_connectionString)
                .AddInterceptors(interceptor)
                .Options;
            return new AttendingDbContext(optionsWithInterceptor);
        }

        var options = new DbContextOptionsBuilder<AttendingDbContext>()
            .UseSqlServer(_connectionString)
            .Options;

        return new AttendingDbContext(options);
    }

    /// <summary>
    /// Creates a context with the audit interceptor wired to a specific user ID
    /// </summary>
    public AttendingDbContext CreateContextAsUser(string userId)
    {
        return CreateContext(new StubCurrentUserService(userId));
    }

    public static readonly Guid DefaultTenantId = new("00000000-0000-0000-0000-000000000001");

    public async Task<Patient> SeedPatientAsync(AttendingDbContext context,
        string mrn = "TEST-001", string firstName = "John", string lastName = "Doe")
    {
        var patient = Patient.Create(DefaultTenantId, mrn, firstName, lastName, new DateTime(1985, 6, 15), BiologicalSex.Male);
        context.Set<Patient>().Add(patient);
        await context.SaveChangesAsync();
        return patient;
    }

    public async Task<User> SeedProviderAsync(AttendingDbContext context,
        string email = "dr.test@attending.ai")
    {
        var user = User.Create(email, "Test", "Provider", UserRole.Provider, "1234567890", "Family Medicine");
        context.Set<User>().Add(user);
        await context.SaveChangesAsync();
        return user;
    }

    public async Task<Encounter> SeedEncounterAsync(AttendingDbContext context,
        Guid patientId, Guid providerId)
    {
        var encounter = Encounter.Create(patientId, providerId, "Office Visit");
        context.Set<Encounter>().Add(encounter);
        await context.SaveChangesAsync();
        return encounter;
    }
}

public class StubCurrentUserService : ICurrentUserService
{
    public StubCurrentUserService(string userId)
    {
        UserId = userId;
    }

    public string? UserId { get; }
    public string? Email => $"{UserId}@test.com";
    public bool IsAuthenticated => true;
    public Guid? TenantId => Guid.TryParse(UserId, out var id) ? id : null;
}
