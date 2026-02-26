using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ATTENDING.Infrastructure.Data;
using ATTENDING.Infrastructure.Repositories;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;

namespace ATTENDING.Integration.Tests.Fixtures;

public class DatabaseFixture : IDisposable
{
    /// <summary>
    /// Default test tenant ID — matches TestAuthHandler and DevAuthHandler identity.
    /// All test seed data is assigned to this organization.
    /// </summary>
    public static readonly Guid DefaultTenantId = new("00000000-0000-0000-0000-000000000001");
    
    public AttendingDbContext DbContext { get; }
    public IServiceProvider Services { get; }

    public DatabaseFixture()
    {
        var services = new ServiceCollection();

        var dbName = $"AttendingTest_{Guid.NewGuid():N}";
        services.AddDbContext<AttendingDbContext>(options =>
            options.UseInMemoryDatabase(dbName));

        services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<AttendingDbContext>());

        // Repositories - explicit registration (no Scrutor)
        services.AddScoped<IPatientRepository, PatientRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IEncounterRepository, EncounterRepository>();
        services.AddScoped<ILabOrderRepository, LabOrderRepository>();
        services.AddScoped<IImagingOrderRepository, ImagingOrderRepository>();
        services.AddScoped<IMedicationOrderRepository, MedicationOrderRepository>();
        services.AddScoped<IReferralRepository, ReferralRepository>();
        services.AddScoped<IAssessmentRepository, AssessmentRepository>();

        // Domain services
        services.AddScoped<IRedFlagEvaluator, RedFlagEvaluator>();
        services.AddScoped<IDrugInteractionService, DrugInteractionService>();

        // Stub audit service
        services.AddScoped<IAuditService, StubAuditService>();

        // Logging
        services.AddLogging(b => b.AddDebug());

        Services = services.BuildServiceProvider();
        DbContext = Services.GetRequiredService<AttendingDbContext>();
    }

    public async Task<Patient> SeedPatientAsync(string mrn = "TEST-001",
        string firstName = "John", string lastName = "Doe",
        Guid? tenantId = null)
    {
        // Clear tracked entities from previous test operations to prevent
        // InMemory provider "duplicate key" errors from stale Added/Modified entries.
        DbContext.ChangeTracker.Clear();
        
        var patient = Patient.Create(mrn, firstName, lastName, new DateTime(1985, 6, 15), "Male");
        patient.SetOrganization(tenantId ?? DefaultTenantId);
        DbContext.Set<Patient>().Add(patient);
        await DbContext.SaveChangesAsync();
        DbContext.ChangeTracker.Clear();
        return patient;
    }

    public async Task<User> SeedProviderAsync(string email = "dr.test@attending.ai",
        string firstName = "Test", string lastName = "Provider",
        Guid? tenantId = null)
    {
        DbContext.ChangeTracker.Clear();
        
        var user = User.Create(email, firstName, lastName, UserRole.Provider, "1234567890", "Family Medicine");
        user.SetOrganization(tenantId ?? DefaultTenantId);
        DbContext.Set<User>().Add(user);
        await DbContext.SaveChangesAsync();
        DbContext.ChangeTracker.Clear();
        return user;
    }

    public async Task<Encounter> SeedEncounterAsync(Guid patientId, Guid providerId,
        Guid? tenantId = null)
    {
        DbContext.ChangeTracker.Clear();
        
        var encounter = Encounter.Create(patientId, providerId, "Office Visit");
        encounter.SetOrganization(tenantId ?? DefaultTenantId);
        DbContext.Set<Encounter>().Add(encounter);
        await DbContext.SaveChangesAsync();
        DbContext.ChangeTracker.Clear();
        return encounter;
    }

    public void Dispose()
    {
        DbContext.Dispose();
        if (Services is IDisposable disposable)
            disposable.Dispose();
    }
}
