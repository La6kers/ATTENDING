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

    public AttendingDbContext(DbContextOptions<AttendingDbContext> options) 
        : base(options)
    {
    }

    public AttendingDbContext(
        DbContextOptions<AttendingDbContext> options,
        IDomainEventDispatcher? domainEventDispatcher)
        : base(options)
    {
        _domainEventDispatcher = domainEventDispatcher;
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
        // Global query filters: soft delete
        // Healthcare data must never be hard-deleted (HIPAA).
        // These filters automatically exclude soft-deleted records
        // from all queries unless explicitly overridden with
        // .IgnoreQueryFilters()
        // --------------------------------------------------------
        modelBuilder.Entity<Patient>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<User>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Encounter>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Allergy>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<MedicalCondition>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<LabOrder>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<ImagingOrder>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<MedicationOrder>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Referral>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<PatientAssessment>().HasQueryFilter(e => !e.IsDeleted);

        // Child entities: matching filters to prevent EF warning 10622
        // (required end of relationship with filtered parent)
        modelBuilder.Entity<AssessmentSymptom>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<AssessmentResponse>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<LabResult>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<ImagingResult>().HasQueryFilter(e => !e.IsDeleted);

        // --------------------------------------------------------
        // Concurrency tokens: RowVersion on all aggregate roots
        // Prevents lost updates in multi-provider environments
        // --------------------------------------------------------
        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
            .Where(t => typeof(BaseEntity).IsAssignableFrom(t.ClrType)
                     && t.ClrType != typeof(AuditLog)))
        {
            modelBuilder.Entity(entityType.ClrType)
                .Property(nameof(BaseEntity.RowVersion))
                .IsRowVersion();

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

    public new async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Process domain events before saving
        var domainEntities = ChangeTracker.Entries<IAggregateRoot>()
            .Where(e => e.Entity is LabOrder or ImagingOrder or MedicationOrder or Referral or PatientAssessment)
            .Select(e => e.Entity)
            .ToList();

        // Collect all domain events before save
        var allDomainEvents = new List<DomainEvent>();
        foreach (var entity in domainEntities)
        {
            switch (entity)
            {
                case LabOrder lo: allDomainEvents.AddRange(lo.DomainEvents); break;
                case ImagingOrder io: allDomainEvents.AddRange(io.DomainEvents); break;
                case MedicationOrder mo: allDomainEvents.AddRange(mo.DomainEvents); break;
                case Referral r: allDomainEvents.AddRange(r.DomainEvents); break;
                case PatientAssessment pa: allDomainEvents.AddRange(pa.DomainEvents); break;
            }
        }

        var result = await base.SaveChangesAsync(cancellationToken);

        // Dispatch domain events after successful save
        if (_domainEventDispatcher != null && allDomainEvents.Count > 0)
        {
            await _domainEventDispatcher.DispatchEventsAsync(allDomainEvents, cancellationToken);
        }

        // Clear domain events after successful save
        foreach (var entity in domainEntities)
        {
            switch (entity)
            {
                case LabOrder lo: lo.ClearDomainEvents(); break;
                case ImagingOrder io: io.ClearDomainEvents(); break;
                case MedicationOrder mo: mo.ClearDomainEvents(); break;
                case Referral r: r.ClearDomainEvents(); break;
                case PatientAssessment pa: pa.ClearDomainEvents(); break;
            }
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
            await SaveChangesAsync(cancellationToken);
            
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
        var entries = ChangeTracker.Entries<BaseEntity>();

        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.SetModified();
            }
        }
    }

    #endregion
}

