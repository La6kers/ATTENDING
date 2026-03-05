using Microsoft.EntityFrameworkCore;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Infrastructure.Data;

namespace ATTENDING.Infrastructure.Repositories;

/// <summary>
/// Base repository implementation
/// </summary>
public class Repository<T> : IRepository<T> where T : class, IAggregateRoot
{
    protected readonly AttendingDbContext Context;
    protected readonly DbSet<T> DbSet;

    public Repository(AttendingDbContext context)
    {
        Context = context;
        DbSet = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await DbSet.FindAsync(new object[] { id }, cancellationToken);
    }

    public virtual async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet.ToListAsync(cancellationToken);
    }

    public virtual async Task AddAsync(T entity, CancellationToken cancellationToken = default)
    {
        await DbSet.AddAsync(entity, cancellationToken);
    }

    public virtual void Update(T entity)
    {
        DbSet.Update(entity);
    }

    public virtual void Remove(T entity)
    {
        DbSet.Remove(entity);
    }
}

/// <summary>
/// Patient repository implementation
/// </summary>
public class PatientRepository : Repository<Patient>, IPatientRepository
{
    public PatientRepository(AttendingDbContext context) : base(context) { }

    public async Task<Patient?> GetByMrnAsync(string mrn, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .FirstOrDefaultAsync(p => p.MRN == mrn, cancellationToken);
    }

    public async Task<IReadOnlyList<Patient>> SearchAsync(
        string? searchTerm,
        int skip = 0,
        int take = 20,
        CancellationToken cancellationToken = default)
    {
        var query = DbSet.AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.ToLower();
            query = query.Where(p =>
                p.MRN.ToLower().Contains(term) ||
                p.FirstName.ToLower().Contains(term) ||
                p.LastName.ToLower().Contains(term) ||
                (p.Email != null && p.Email.ToLower().Contains(term)));
        }

        return await query
            .OrderBy(p => p.LastName)
            .ThenBy(p => p.FirstName)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<Patient?> GetWithAllergiesAsync(Guid patientId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(p => p.Allergies.Where(a => a.IsActive))
            .FirstOrDefaultAsync(p => p.Id == patientId, cancellationToken);
    }

    public async Task<Patient?> GetWithConditionsAsync(Guid patientId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(p => p.Conditions.Where(c => c.IsActive))
            .FirstOrDefaultAsync(p => p.Id == patientId, cancellationToken);
    }

    public async Task<Patient?> GetWithFullHistoryAsync(Guid patientId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(p => p.Allergies.Where(a => a.IsActive))
            .Include(p => p.Conditions.Where(c => c.IsActive))
            .Include(p => p.Encounters.OrderByDescending(e => e.CreatedAt).Take(10))
            .FirstOrDefaultAsync(p => p.Id == patientId, cancellationToken);
    }

    /// <summary>
    /// Inserts an allergy directly into the Allergies DbSet.
    /// Bypasses loading the Patient's Allergies collection to avoid EF InMemory
    /// instability with filtered-Include change tracking when adding child entities.
    /// </summary>
    public async Task AddAllergyAsync(Allergy allergy, CancellationToken cancellationToken = default)
    {
        await Context.Set<Allergy>().AddAsync(allergy, cancellationToken);
    }

    /// <summary>
    /// Finds an existing patient in the given organization matching first name, last name,
    /// and date of birth. Used for COMPASS deduplication. The query bypasses the
    /// tenant global filter via IgnoreQueryFilters so it can search within a specific
    /// orgId even when ICurrentUserService has no authenticated tenant (anonymous COMPASS).
    /// </summary>
    public async Task<Patient?> FindByNameAndDobAsync(
        string firstName, string lastName, DateTime dateOfBirth, Guid organizationId,
        CancellationToken cancellationToken = default)
    {
        return await Context.Patients
            .IgnoreQueryFilters()
            .Where(p =>
                !p.IsDeleted &&
                p.OrganizationId == organizationId &&
                p.FirstName.ToLower() == firstName.ToLower() &&
                p.LastName.ToLower() == lastName.ToLower() &&
                p.DateOfBirth.Date == dateOfBirth.Date)
            .FirstOrDefaultAsync(cancellationToken);
    }
}

/// <summary>
/// User repository implementation
/// </summary>
public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(AttendingDbContext context) : base(context) { }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .FirstOrDefaultAsync(u => u.Email == email.ToLower(), cancellationToken);
    }

    public async Task<User?> GetByAzureAdObjectIdAsync(string objectId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .FirstOrDefaultAsync(u => u.AzureAdObjectId == objectId, cancellationToken);
    }

    public async Task<IReadOnlyList<User>> GetByRoleAsync(UserRole role, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(u => u.Role == role && u.IsActive)
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<User>> GetProvidersAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(u => u.Role == UserRole.Provider && u.IsActive)
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// Encounter repository implementation
/// </summary>
public class EncounterRepository : Repository<Encounter>, IEncounterRepository
{
    public EncounterRepository(AttendingDbContext context) : base(context) { }

    public async Task<Encounter?> GetByEncounterNumberAsync(string encounterNumber, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(e => e.Patient)
            .Include(e => e.Provider)
            .FirstOrDefaultAsync(e => e.EncounterNumber == encounterNumber, cancellationToken);
    }

    public async Task<IReadOnlyList<Encounter>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(e => e.PatientId == patientId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Encounter>> GetByProviderIdAsync(Guid providerId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(e => e.ProviderId == providerId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Encounter>> GetByStatusAsync(EncounterStatus status, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(e => e.Status == status)
            .Include(e => e.Patient)
            .OrderBy(e => e.ScheduledAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Encounter>> GetTodaysEncountersAsync(Guid providerId, CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        return await DbSet
            .Where(e => e.ProviderId == providerId &&
                        e.ScheduledAt >= today &&
                        e.ScheduledAt < tomorrow)
            .Include(e => e.Patient)
            .OrderBy(e => e.ScheduledAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Encounter?> GetWithOrdersAsync(Guid encounterId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(e => e.Patient)
            .Include(e => e.Provider)
            .Include(e => e.LabOrders)
            .FirstOrDefaultAsync(e => e.Id == encounterId, cancellationToken);
    }
}

/// <summary>
/// Lab order repository implementation
/// </summary>
public class LabOrderRepository : Repository<LabOrder>, ILabOrderRepository
{
    public LabOrderRepository(AttendingDbContext context) : base(context) { }

    public async Task<LabOrder?> GetByOrderNumberAsync(string orderNumber, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(o => o.Patient)
            .Include(o => o.OrderingProvider)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, cancellationToken);
    }

    public async Task<IReadOnlyList<LabOrder>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(o => o.PatientId == patientId)
            .OrderByDescending(o => o.OrderedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LabOrder>> GetByEncounterIdAsync(Guid encounterId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(o => o.EncounterId == encounterId)
            .OrderByDescending(o => o.OrderedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LabOrder>> GetByStatusAsync(LabOrderStatus status, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(o => o.Status == status)
            .Include(o => o.Patient)
            .OrderBy(o => o.Priority)
            .ThenBy(o => o.OrderedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LabOrder>> GetPendingOrdersAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(o => o.Status == LabOrderStatus.Pending)
            .Include(o => o.Patient)
            .OrderBy(o => o.Priority)
            .ThenBy(o => o.OrderedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LabOrder>> GetCriticalResultsAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(o => o.Status == LabOrderStatus.CriticalResult)
            .Include(o => o.Patient)
            .Include(o => o.OrderingProvider)
            .Include(o => o.Result)
            .OrderByDescending(o => o.ResultedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LabOrder>> GetByDateRangeAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Where(o => o.OrderedAt >= startDate && o.OrderedAt <= endDate)
            .OrderByDescending(o => o.OrderedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<LabOrder?> GetWithResultAsync(Guid labOrderId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(o => o.Result)
            .FirstOrDefaultAsync(o => o.Id == labOrderId, cancellationToken);
    }
}
