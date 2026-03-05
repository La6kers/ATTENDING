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
    /// <summary>
    /// Adds an allergy directly to the Allergies table without loading the parent Patient
    /// collection. Avoids EF InMemory instability caused by filtered-Include change tracking.
    /// </summary>
    Task AddAllergyAsync(Allergy allergy, CancellationToken cancellationToken = default);
    Task<Patient?> GetWithFullHistoryAsync(Guid patientId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Looks up an existing patient within the given organization by first name, last name,
    /// and date of birth. Used by COMPASS anonymous intake to deduplicate patients
    /// instead of creating a new Patient record on every submission.
    /// Returns null if no match is found.
    /// </summary>
    Task<Patient?> FindByNameAndDobAsync(
        string firstName, string lastName, DateTime dateOfBirth, Guid organizationId,
        CancellationToken cancellationToken = default);
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

    /// <summary>
    /// Returns the count of assessments pending provider review.
    /// Issues SELECT COUNT(*) rather than materializing all records -- use this for
    /// queue-position calculations instead of GetPendingReviewAsync().Count.
    /// </summary>
    Task<int> GetPendingReviewCountAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PatientAssessment>> GetWithRedFlagsAsync(CancellationToken cancellationToken = default);
    Task<PatientAssessment?> GetWithSymptomsAsync(Guid assessmentId, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<PatientAssessment> Items, int TotalCount)> GetFilteredAsync(
        string? status = null, string? triageLevel = null, bool? hasRedFlags = null,
        int skip = 0, int take = 50, CancellationToken cancellationToken = default);
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

/// <summary>
/// AI Feedback repository interface
/// </summary>
public interface IAiFeedbackRepository
{
    Task<AiFeedback?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(AiFeedback feedback, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AiFeedback>> GetByProviderAsync(Guid providerId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AiFeedback>> GetByRequestIdAsync(string requestId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AiFeedback>> GetByTypeAsync(string recommendationType, int skip = 0, int take = 50, CancellationToken cancellationToken = default);
    Task<(int totalCount, int helpfulCount, double avgAccuracy)> GetStatsAsync(
        string? recommendationType = null, CancellationToken cancellationToken = default);
}

/// <summary>
/// Repository for the ML Diagnostic Learning Engine — outcomes, signals, and snapshots.
/// </summary>
public interface IDiagnosticLearningRepository
{
    // DiagnosticOutcome
    Task<DiagnosticOutcome?> GetOutcomeByIdAsync(Guid id, CancellationToken ct = default);
    Task<DiagnosticOutcome?> GetOutcomeByEncounterAsync(Guid encounterId, string recommendationType, CancellationToken ct = default);
    Task AddOutcomeAsync(DiagnosticOutcome outcome, CancellationToken ct = default);
    Task<IReadOnlyList<DiagnosticOutcome>> GetUnprocessedOutcomesAsync(int batchSize = 50, CancellationToken ct = default);

    // LearningSignal
    Task AddSignalAsync(LearningSignal signal, CancellationToken ct = default);
    Task<IReadOnlyList<LearningSignal>> GetSignalsAsync(
        string recommendationType,
        string? guidelineName,
        DateTime windowStart,
        DateTime windowEnd,
        CancellationToken ct = default);
    Task<int> GetSignalCountAsync(string recommendationType, string? guidelineName, CancellationToken ct = default);

    // DiagnosticAccuracySnapshot
    Task AddSnapshotAsync(DiagnosticAccuracySnapshot snapshot, CancellationToken ct = default);
    Task<DiagnosticAccuracySnapshot?> GetLatestSnapshotAsync(
        string recommendationType,
        string? guidelineName,
        CancellationToken ct = default);
    Task<IReadOnlyList<DiagnosticAccuracySnapshot>> GetSnapshotHistoryAsync(
        string recommendationType,
        string? guidelineName,
        int limit = 12,
        CancellationToken ct = default);
    Task<IReadOnlyList<DiagnosticAccuracySnapshot>> GetAllLatestSnapshotsAsync(CancellationToken ct = default);

    // Calibration
    Task<decimal?> GetCalibrationAdjustmentAsync(
        string guidelineName,
        CancellationToken ct = default);
}

/// <summary>
/// Repository for ambient scribe recording sessions and generated notes.
/// </summary>
public interface IEncounterRecordingRepository : IRepository<EncounterRecording>
{
    Task<EncounterRecording?> GetByEncounterIdAsync(Guid encounterId, CancellationToken ct = default);
    Task<EncounterRecording?> GetWithSegmentsAsync(Guid recordingId, CancellationToken ct = default);
    Task<EncounterRecording?> GetWithNoteAsync(Guid recordingId, CancellationToken ct = default);
    Task<AmbientNote?> GetNoteByEncounterIdAsync(Guid encounterId, CancellationToken ct = default);
    Task<AmbientNote?> GetNoteByIdAsync(Guid noteId, CancellationToken ct = default);
    Task AddNoteAsync(AmbientNote note, CancellationToken ct = default);
    Task AddSegmentAsync(TranscriptSegment segment, CancellationToken ct = default);
    Task<IReadOnlyList<TranscriptSegment>> GetSegmentsAsync(Guid recordingId, CancellationToken ct = default);
}

/// <summary>
/// Provides current user context for audit trails and tenant isolation.
/// Implemented in the API layer using HttpContext.
/// </summary>
/// <summary>
/// Repository for behavioral health screening sessions and responses.
/// </summary>
public interface IBehavioralHealthRepository
{
    Task<BehavioralHealthScreening?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<BehavioralHealthScreening?> GetWithResponsesAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<BehavioralHealthScreening>> GetByPatientIdAsync(Guid patientId, CancellationToken ct = default);
    Task<IReadOnlyList<BehavioralHealthScreening>> GetByEncounterIdAsync(Guid encounterId, CancellationToken ct = default);
    Task<IReadOnlyList<BehavioralHealthScreening>> GetPendingReviewAsync(CancellationToken ct = default);
    Task<BehavioralHealthScreening?> GetLatestByInstrumentAsync(Guid patientId, ScreeningInstrument instrument, CancellationToken ct = default);
    Task<IReadOnlyList<BehavioralHealthScreening>> GetActiveSuicideRiskAsync(CancellationToken ct = default);
    Task AddAsync(BehavioralHealthScreening screening, CancellationToken ct = default);
    void Update(BehavioralHealthScreening screening);
}

public interface ICurrentUserService
{
    string? UserId { get; }
    string? Email { get; }
    bool IsAuthenticated { get; }
    
    /// <summary>
    /// The tenant (organization) ID resolved from the authenticated user's JWT.
    /// Used by AuditSaveChangesInterceptor to auto-set OrganizationId on new entities
    /// and by AttendingDbContext global query filters for tenant isolation.
    /// </summary>
    Guid? TenantId { get; }
}
