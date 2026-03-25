using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Events;

namespace ATTENDING.Infrastructure.Data;

/// <summary>
/// Entity Framework Core DbContext for ATTENDING AI
/// </summary>
public class AttendingDbContext : DbContext, IUnitOfWork
{
    private IDbContextTransaction? _currentTransaction;
    private readonly IDomainEventDispatcher? _domainEventDispatcher;
    private readonly ICurrentUserService? _currentUserService;
    
    /// <summary>
    /// Current tenant ID for global query filters.
    /// Resolved from the authenticated user's JWT via ICurrentUserService.
    /// </summary>
    private Guid? _tenantId => _currentUserService?.TenantId;

    /// <summary>
    /// When true, the context is operating in admin/background mode and tenant
    /// filters are intentionally bypassed. Must be explicitly set via EnableAdminContext().
    /// Never flows from the HTTP request path.
    /// </summary>
    private bool _adminContextEnabled = false;

    /// <summary>
    /// Explicitly enables cross-tenant access for background jobs, migrations, and admin operations.
    /// Callers MUST document why they need cross-tenant access in the call site comment.
    ///
    /// Usage:
    ///   context.EnableAdminContext(); // "audit rotation -- must access all tenants"
    ///
    /// Do NOT call this from request-scoped code. For HTTP requests,
    /// ICurrentUserService must always return a valid TenantId.
    /// </summary>
    public AttendingDbContext EnableAdminContext()
    {
        _adminContextEnabled = true;
        return this;
    }

    public AttendingDbContext(DbContextOptions<AttendingDbContext> options) 
        : base(options)
    {
    }

    public AttendingDbContext(
        DbContextOptions<AttendingDbContext> options,
        IDomainEventDispatcher? domainEventDispatcher,
        ICurrentUserService? currentUserService = null)
        : base(options)
    {
        _domainEventDispatcher = domainEventDispatcher;
        _currentUserService = currentUserService;
    }

    #region DbSets

    // Identity
    public DbSet<User> Users => Set<User>();
    
    // Clinical
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Encounter> Encounters => Set<Encounter>();
    public DbSet<Allergy> Allergies => Set<Allergy>();
    public DbSet<MedicalCondition> MedicalConditions => Set<MedicalCondition>();
    
    // Orders
    public DbSet<LabOrder> LabOrders => Set<LabOrder>();
    public DbSet<LabResult> LabResults => Set<LabResult>();
    public DbSet<ImagingOrder> ImagingOrders => Set<ImagingOrder>();
    public DbSet<ImagingResult> ImagingResults => Set<ImagingResult>();
    public DbSet<MedicationOrder> MedicationOrders => Set<MedicationOrder>();
    public DbSet<Referral> Referrals => Set<Referral>();
    
    // Assessments
    public DbSet<PatientAssessment> Assessments => Set<PatientAssessment>();
    public DbSet<AssessmentSymptom> AssessmentSymptoms => Set<AssessmentSymptom>();
    public DbSet<AssessmentResponse> AssessmentResponses => Set<AssessmentResponse>();
    
    // Audit
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    
    // AI
    public DbSet<AiFeedback> AiFeedback => Set<AiFeedback>();

    // ML Diagnostic Learning Engine (d5)
    public DbSet<DiagnosticOutcome> DiagnosticOutcomes => Set<DiagnosticOutcome>();
    public DbSet<LearningSignal> LearningSignals => Set<LearningSignal>();
    public DbSet<DiagnosticAccuracySnapshot> DiagnosticAccuracySnapshots => Set<DiagnosticAccuracySnapshot>();

    // Ambient Scribe
    public DbSet<EncounterRecording> EncounterRecordings => Set<EncounterRecording>();
    public DbSet<TranscriptSegment> TranscriptSegments => Set<TranscriptSegment>();
    public DbSet<AmbientNote> AmbientNotes => Set<AmbientNote>();

    // Behavioral Health Screening
    public DbSet<BehavioralHealthScreening> BehavioralHealthScreenings => Set<BehavioralHealthScreening>();
    public DbSet<ScreeningResponse> ScreeningResponses => Set<ScreeningResponse>();

    // Organization / Onboarding
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<EhrConnectorConfig> EhrConnectors => Set<EhrConnectorConfig>();

    // Emergency Access (patient opt-in, HIPAA audit required)
    public DbSet<EmergencyAccessProfile> EmergencyAccessProfiles => Set<EmergencyAccessProfile>();
    public DbSet<EmergencyAccessLog> EmergencyAccessLogs => Set<EmergencyAccessLog>();

    #endregion

    #region Configuration

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all configurations from the assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AttendingDbContext).Assembly);

        // DomainEvent is an in-memory eventing primitive -- never persisted to the database.
        // Without this, EF picks up IReadOnlyCollection<DomainEvent> navigation properties
        // on EmergencyAccessProfile/Log and tries to map DomainEvent as a table, which
        // fails model validation because DomainEvent has no primary key convention.
        modelBuilder.Ignore<Domain.Events.DomainEvent>();

        // Configure schemas
        modelBuilder.HasDefaultSchema("clinical");

        // --------------------------------------------------------
        // Global query filters: soft delete + multi-tenant isolation
        //
        // HIPAA: Healthcare data must never be hard-deleted.
        // TENANT: Every query is scoped to the current user's organization.
        //
        // Tenant filter is bypassed ONLY when _adminContextEnabled is true.
        // That flag is set explicitly via EnableAdminContext() -- never implicitly.
        // Accidental null TenantId on an HTTP request now returns NO data rather
        // than all tenants' data, which is the safe failure mode for PHI.
        //
        // Background jobs / migrations: call context.EnableAdminContext() first.
        // To bypass soft-delete as well: use .IgnoreQueryFilters() explicitly.
        // --------------------------------------------------------
        modelBuilder.Entity<Patient>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<User>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<Encounter>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<Allergy>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<MedicalCondition>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<LabOrder>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<ImagingOrder>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<MedicationOrder>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<Referral>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<PatientAssessment>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));

        // Emergency Access -- profile uses standard tenant filter.
        // AccessLog is immutable audit (never soft-deleted) but still tenant-scoped
        // so patients can only see their own access history.
        modelBuilder.Entity<EmergencyAccessProfile>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<EmergencyAccessLog>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));

        // ML Diagnostic Learning Engine
        modelBuilder.Entity<DiagnosticOutcome>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<LearningSignal>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<DiagnosticAccuracySnapshot>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));

        // Ambient Scribe
        modelBuilder.Entity<EncounterRecording>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<TranscriptSegment>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<AmbientNote>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));

        // Behavioral Health Screening
        // 42 CFR Part 2: IsPartTwoProtected is a field-level flag, not a query filter.
        // Part 2 access control is enforced at the handler/controller layer, not here.
        modelBuilder.Entity<BehavioralHealthScreening>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<ScreeningResponse>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));

        // Child entities: matching filters to prevent EF warning 10622
        // (required end of relationship with filtered parent)
        modelBuilder.Entity<AssessmentSymptom>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<AssessmentResponse>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<LabResult>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));
        modelBuilder.Entity<ImagingResult>().HasQueryFilter(e => !e.IsDeleted && (_adminContextEnabled || e.OrganizationId == _tenantId));

        // --------------------------------------------------------
        // Concurrency tokens: RowVersion on all aggregate roots
        // Prevents lost updates in multi-provider environments
        //
        // NOTE: IsRowVersion() is skipped for InMemory provider because
        // InMemory auto-generates byte[] values that cause spurious
        // DbUpdateConcurrencyException. Real concurrency is tested
        // via Testcontainers (Docker) with actual SQL Server.
        // --------------------------------------------------------
        var isInMemory = Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory";

        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
            .Where(t => typeof(BaseEntity).IsAssignableFrom(t.ClrType)
                     && t.ClrType != typeof(AuditLog)))
        {
            if (!isInMemory)
            {
                modelBuilder.Entity(entityType.ClrType)
                    .Property(nameof(BaseEntity.RowVersion))
                    .IsRowVersion();
            }
            else
            {
                // InMemory: completely disable RowVersion concurrency semantics.
                // IsRowVersion() sets both IsConcurrencyToken + ValueGeneratedOnAddOrUpdate.
                // We must undo BOTH: stop treating it as a concurrency token AND stop
                // auto-generating values (which causes byte[] mismatch on save).
                modelBuilder.Entity(entityType.ClrType)
                    .Property(nameof(BaseEntity.RowVersion))
                    .IsConcurrencyToken(false)
                    .ValueGeneratedNever();
            }

            modelBuilder.Entity(entityType.ClrType)
                .Property(nameof(BaseEntity.IsDeleted))
                .HasDefaultValue(false);

            modelBuilder.Entity(entityType.ClrType)
                .Property(nameof(BaseEntity.CreatedBy))
                .HasMaxLength(100);

            modelBuilder.Entity(entityType.ClrType)
                .Property(nameof(BaseEntity.ModifiedBy))
                .HasMaxLength(100);

            modelBuilder.Entity(entityType.ClrType)
                .Property(nameof(BaseEntity.DeletedBy))
                .HasMaxLength(100);

            // OrganizationId index -- accelerates tenant-scoped queries
            modelBuilder.Entity(entityType.ClrType)
                .HasIndex(nameof(BaseEntity.OrganizationId))
                .HasDatabaseName($"IX_{entityType.ClrType.Name}_OrganizationId");
        }
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Global string default: 2000 chars is a safe fallback for most structured fields.
        // FREE-TEXT and JSON fields (VoiceTranscript, *Json, OldValues/NewValues in AuditLog,
        // patient-entered text, etc.) MUST be explicitly overridden with
        //   HasColumnType("nvarchar(max)")
        // in their individual entity configurations (see AssessmentConfigurations.cs,
        // AuditLogConfiguration.cs, etc.).
        // A 500-char limit here would silently truncate clinical records -- a HIPAA
        // and patient-safety risk.
        configurationBuilder.Properties<string>()
            .HaveMaxLength(2000);

        // Configure all DateTime properties to datetime2 (higher precision than datetime)
        configurationBuilder.Properties<DateTime>()
            .HaveColumnType("datetime2");
    }

    #endregion

    #region IUnitOfWork Implementation

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await DispatchDomainEventsAndSaveAsync(
            () => base.SaveChangesAsync(cancellationToken), cancellationToken);
    }

    public override async Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        return await DispatchDomainEventsAndSaveAsync(
            () => base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken),
            cancellationToken);
    }

    /// <summary>
    /// Collects domain events from all aggregate roots, persists changes, then dispatches events.
    ///
    /// Events are captured BEFORE saving so domain state is snapshotted at decision time.
    /// Events are dispatched AFTER a successful save so side-effects only run on committed data.
    ///
    /// Both SaveChangesAsync overloads route through here to guarantee consistent event
    /// dispatch regardless of which overload the caller uses.
    ///
    /// AUDIT STAMPING: AuditSaveChangesInterceptor is the primary audit stamper in production
    /// (SQL Server). However the test WebApplicationFactory intentionally omits the interceptor
    /// because it causes DbUpdateConcurrencyException with the InMemory provider. StampAuditFields()
    /// runs HERE as a provider-agnostic backstop so InMemory tests pass and OrganizationId is
    /// always set. On SQL Server the interceptor runs as well -- both are idempotent so double-
    /// stamping is harmless.
    /// </summary>
    private async Task<int> DispatchDomainEventsAndSaveAsync(
        Func<Task<int>> saveFunc, CancellationToken cancellationToken)
    {
        // Stamp audit fields only when running under the InMemory provider (tests).
        // In production (SQL Server), AuditSaveChangesInterceptor handles stamping
        // inside the EF pipeline. Running both on SQL Server is harmless (idempotent)
        // but creates unnecessary CPU work on every save. Guarding here eliminates
        // that redundancy while keeping the test backstop intact.
        if (Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
            StampAuditFields();

        var domainEntities = ChangeTracker.Entries<IHasDomainEvents>()
            .Select(e => e.Entity)
            .ToList();

        var allDomainEvents = domainEntities
            .SelectMany(e => e.DomainEvents)
            .ToList();

        var result = await saveFunc();

        if (_domainEventDispatcher != null && allDomainEvents.Count > 0)
        {
            await _domainEventDispatcher.DispatchEventsAsync(allDomainEvents, cancellationToken);
        }

        foreach (var entity in domainEntities)
        {
            entity.ClearDomainEvents();
        }

        return result;
    }

    /// <summary>
    /// Provider-agnostic audit field stamping. Runs before every SaveChangesAsync so that
    /// OrganizationId, CreatedBy, and soft-delete conversions are applied regardless of
    /// whether AuditSaveChangesInterceptor is registered (it is omitted for InMemory tests).
    ///
    /// On SQL Server, AuditSaveChangesInterceptor also runs -- both are idempotent.
    ///
    /// NOTE: Child entities (LabResult, ImagingResult, AssessmentSymptom, etc.) do not
    /// explicitly accept OrganizationId in their Create() factory methods. The interceptor
    /// auto-stamps OrganizationId from the current user's tenant on SaveChangesAsync().
    /// If creating entities outside of a request context, manually set OrganizationId.
    /// </summary>
    private void StampAuditFields()
    {
        var userId   = _currentUserService?.UserId ?? "system";
        var tenantId = _currentUserService?.TenantId;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.SetCreatedBy(userId);
                    if (entry.Entity.OrganizationId == Guid.Empty && tenantId.HasValue)
                        entry.Entity.SetOrganization(tenantId.Value);
                    break;

                case EntityState.Modified:
                    entry.Entity.SetModified(userId);
                    break;

                case EntityState.Deleted:
                    // Convert hard deletes to soft deletes (HIPAA requirement)
                    entry.State = EntityState.Modified;
                    entry.Entity.SoftDelete(userId);
                    break;
            }
        }
    }

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_currentTransaction != null)
        {
            return;
        }

        _currentTransaction = await Database.BeginTransactionAsync(cancellationToken);
    }

    public async Task CommitTransactionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.CommitAsync(cancellationToken);
            }
        }
        catch
        {
            await RollbackTransactionAsync(cancellationToken);
            throw;
        }
        finally
        {
            if (_currentTransaction != null)
            {
                _currentTransaction.Dispose();
                _currentTransaction = null;
            }
        }
    }

    public async Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.RollbackAsync(cancellationToken);
            }
        }
        finally
        {
            if (_currentTransaction != null)
            {
                _currentTransaction.Dispose();
                _currentTransaction = null;
            }
        }
    }

    #endregion
}
