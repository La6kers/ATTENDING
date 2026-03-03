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
    ///   context.EnableAdminContext(); // "audit rotation — must access all tenants"
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

    // Organization / Onboarding
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<EhrConnectorConfig> EhrConnectors => Set<EhrConnectorConfig>();

    #endregion

    #region Configuration

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all configurations from the assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AttendingDbContext).Assembly);

        // Configure schemas
        modelBuilder.HasDefaultSchema("clinical");

        // --------------------------------------------------------
        // Global query filters: soft delete + multi-tenant isolation
        //
        // HIPAA: Healthcare data must never be hard-deleted.
        // TENANT: Every query is scoped to the current user's organization.
        //
        // Tenant filter is bypassed ONLY when _adminContextEnabled is true.
        // That flag is set explicitly via EnableAdminContext() — never implicitly.
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

            // OrganizationId index — accelerates tenant-scoped queries
            modelBuilder.Entity(entityType.ClrType)
                .HasIndex(nameof(BaseEntity.OrganizationId))
                .HasDatabaseName($"IX_{entityType.ClrType.Name}_OrganizationId");
        }
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Configure all string properties to use nvarchar
        configurationBuilder.Properties<string>()
            .HaveMaxLength(500);

        // Configure all DateTime properties
        configurationBuilder.Properties<DateTime>()
            .HaveColumnType("datetime2");
    }

    #endregion

    #region IUnitOfWork Implementation

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Collect domain events from all aggregate roots that implement IHasDomainEvents.
        // New aggregate roots are picked up automatically — no type-switch maintenance needed.
        var domainEntities = ChangeTracker.Entries<IHasDomainEvents>()
            .Select(e => e.Entity)
            .ToList();

        var allDomainEvents = domainEntities
            .SelectMany(e => e.DomainEvents)
            .ToList();

        var result = await base.SaveChangesAsync(cancellationToken);

        // Dispatch domain events after successful save
        if (_domainEventDispatcher != null && allDomainEvents.Count > 0)
        {
            await _domainEventDispatcher.DispatchEventsAsync(allDomainEvents, cancellationToken);
        }

        // Clear domain events after successful save
        foreach (var entity in domainEntities)
        {
            entity.ClearDomainEvents();
        }

        return result;
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
            // Callers are responsible for SaveChangesAsync before committing.
            // CommitTransaction only finalizes the DB transaction.
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

    #region Overrides for Audit

    public override int SaveChanges()
    {
        UpdateAuditFields();
        return base.SaveChanges();
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        UpdateAuditFields();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        UpdateAuditFields();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void UpdateAuditFields()
    {
        var userId = _currentUserService?.UserId ?? "system";
        var tenantId = _currentUserService?.TenantId;
        var entries = ChangeTracker.Entries<BaseEntity>();

        foreach (var entry in entries)
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.SetCreatedBy(userId);
                    // Auto-set tenant on new entities — ensures every record
                    // is bound to the authenticated user's organization.
                    if (entry.Entity.OrganizationId == Guid.Empty && tenantId.HasValue)
                    {
                        entry.Entity.SetOrganization(tenantId.Value);
                    }
                    break;

                case EntityState.Modified:
                    entry.Entity.SetModified(userId);
                    break;

                case EntityState.Deleted:
                    // Intercept hard deletes → soft deletes (HIPAA)
                    entry.State = EntityState.Modified;
                    entry.Entity.SoftDelete(userId);
                    break;
            }
        }
    }

    #endregion
}

