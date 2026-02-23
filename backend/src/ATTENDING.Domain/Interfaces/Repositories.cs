using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Domain.Interfaces;

/// <summary>
/// Unit of Work pattern for transaction management
/// </summary>
public interface IUnitOfWork : IDisposable
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Base repository interface
/// </summary>
public interface IRepository<T> where T : class, IAggregateRoot
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(T entity, CancellationToken cancellationToken = default);
    void Update(T entity);
    void Remove(T entity);
}

/// <summary>
/// Patient repository interface
/// </summary>
public interface IPatientRepository : IRepository<Patient>
{
    Task<Patient?> GetByMrnAsync(string mrn, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Patient>> SearchAsync(
        string? searchTerm,
        int skip = 0,
        int take = 20,
        CancellationToken cancellationToken = default);
    Task<Patient?> GetWithAllergiesAsync(Guid patientId, CancellationToken cancellationToken = default);
    Task<Patient?> GetWithConditionsAsync(Guid patientId, CancellationToken cancellationToken = default);
    Task<Patient?> GetWithFullHistoryAsync(Guid patientId, CancellationToken cancellationToken = default);
}

/// <summary>
/// User repository interface
/// </summary>
public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<User?> GetByAzureAdObjectIdAsync(string objectId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<User>> GetByRoleAsync(UserRole role, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<User>> GetProvidersAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Encounter repository interface
/// </summary>
public interface IEncounterRepository : IRepository<Encounter>
{
    Task<Encounter?> GetByEncounterNumberAsync(string encounterNumber, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Encounter>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Encounter>> GetByProviderIdAsync(Guid providerId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Encounter>> GetByStatusAsync(EncounterStatus status, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Encounter>> GetTodaysEncountersAsync(Guid providerId, CancellationToken cancellationToken = default);
    Task<Encounter?> GetWithOrdersAsync(Guid encounterId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Lab order repository interface
/// </summary>
public interface ILabOrderRepository : IRepository<LabOrder>
{
    Task<LabOrder?> GetByOrderNumberAsync(string orderNumber, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LabOrder>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LabOrder>> GetByEncounterIdAsync(Guid encounterId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LabOrder>> GetByStatusAsync(LabOrderStatus status, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LabOrder>> GetPendingOrdersAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LabOrder>> GetCriticalResultsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LabOrder>> GetByDateRangeAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default);
    Task<LabOrder?> GetWithResultAsync(Guid labOrderId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Imaging order repository interface
/// </summary>
public interface IImagingOrderRepository : IRepository<ImagingOrder>
{
    Task<ImagingOrder?> GetByOrderNumberAsync(string orderNumber, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ImagingOrder>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ImagingOrder>> GetByEncounterIdAsync(Guid encounterId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ImagingOrder>> GetByStatusAsync(ImagingOrderStatus status, CancellationToken cancellationToken = default);
    Task<decimal> GetPatientRadiationDoseAsync(Guid patientId, int monthsBack = 12, CancellationToken cancellationToken = default);
}

/// <summary>
/// Medication order repository interface
/// </summary>
public interface IMedicationOrderRepository : IRepository<MedicationOrder>
{
    Task<IReadOnlyList<MedicationOrder>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MedicationOrder>> GetActiveByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MedicationOrder>> GetByEncounterIdAsync(Guid encounterId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Referral repository interface
/// </summary>
public interface IReferralRepository : IRepository<Referral>
{
    Task<IReadOnlyList<Referral>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Referral>> GetByStatusAsync(ReferralStatus status, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Referral>> GetPendingBySpecialtyAsync(string specialty, CancellationToken cancellationToken = default);
}

/// <summary>
/// Dispatches domain events collected from aggregate roots
/// </summary>
public interface IDomainEventDispatcher
{
    Task DispatchEventsAsync(IEnumerable<Events.DomainEvent> domainEvents, CancellationToken cancellationToken = default);
}

/// <summary>
/// Assessment repository interface
/// </summary>
public interface IAssessmentRepository : IRepository<PatientAssessment>
{
    Task<IReadOnlyList<PatientAssessment>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PatientAssessment>> GetPendingReviewAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PatientAssessment>> GetWithRedFlagsAsync(CancellationToken cancellationToken = default);
    Task<PatientAssessment?> GetWithSymptomsAsync(Guid assessmentId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Audit service interface
/// </summary>
public interface IAuditService
{
    Task LogAsync(AuditEntry entry, CancellationToken cancellationToken = default);
    Task LogPhiAccessAsync(
        Guid userId,
        Guid patientId,
        string action,
        string resourceType,
        Guid? resourceId = null,
        string? details = null,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AuditLog>> GetByPatientIdAsync(
        Guid patientId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AuditLog>> GetByUserIdAsync(
        Guid userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Audit entry for logging
/// </summary>
public class AuditEntry
{
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string? PatientId { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public Dictionary<string, object>? Details { get; set; }
    public Dictionary<string, object>? OldValues { get; set; }
    public Dictionary<string, object>? NewValues { get; set; }
}
