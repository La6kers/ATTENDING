using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;
using ATTENDING.Domain.ValueObjects;

namespace ATTENDING.Domain.Entities;

/// <summary>
/// Base entity with audit fields, concurrency control, multi-tenant isolation,
/// and soft delete. All clinical entities inherit these enterprise capabilities.
/// </summary>
public abstract class BaseEntity
{
    /// <summary>
    /// Multi-tenant isolation — every clinical entity belongs to exactly one organization.
    /// Global query filters in AttendingDbContext ensure cross-tenant data never leaks.
    /// Set automatically by AuditSaveChangesInterceptor from the authenticated user's tenant.
    /// </summary>
    public Guid OrganizationId { get; protected set; }
    
    public DateTime CreatedAt { get; protected set; }
    public DateTime? ModifiedAt { get; protected set; }
    public string? CreatedBy { get; protected set; }
    public string? ModifiedBy { get; protected set; }
    
    /// <summary>
    /// Optimistic concurrency token — prevents lost updates
    /// in multi-provider clinical environments
    /// </summary>
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    
    /// <summary>
    /// Soft delete — healthcare data must never be hard-deleted (HIPAA)
    /// </summary>
    public bool IsDeleted { get; protected set; }
    public DateTime? DeletedAt { get; protected set; }
    public string? DeletedBy { get; protected set; }
    
    protected BaseEntity()
    {
        CreatedAt = DateTime.UtcNow;
    }
    
    public void SetModified(string? userId = null)
    {
        ModifiedAt = DateTime.UtcNow;
        ModifiedBy = userId;
    }
    
    public void SetCreatedBy(string userId)
    {
        CreatedBy = userId;
    }
    
    /// <summary>
    /// Set the tenant for this entity. Called automatically by the
    /// AuditSaveChangesInterceptor on entity creation.
    /// </summary>
    public void SetOrganization(Guid organizationId)
    {
        if (OrganizationId == Guid.Empty)
            OrganizationId = organizationId;
    }
    
    /// <summary>
    /// Soft delete — marks entity as deleted without removing from database
    /// </summary>
    public virtual void SoftDelete(string? userId = null)
    {
        IsDeleted = true;
        DeletedAt = DateTime.UtcNow;
        DeletedBy = userId;
    }
    
    /// <summary>
    /// Restore a soft-deleted entity
    /// </summary>
    public virtual void Restore()
    {
        IsDeleted = false;
        DeletedAt = null;
        DeletedBy = null;
    }
}

/// <summary>
/// Marker interface for aggregate roots
/// </summary>
public interface IAggregateRoot { }

/// <summary>
/// Implemented by aggregate roots that raise domain events.
/// AttendingDbContext.SaveChangesAsync uses this interface to collect and
/// dispatch events generically, so new aggregate roots never require
/// a matching case in a type-switch.
/// </summary>
public interface IHasDomainEvents
{
    IReadOnlyCollection<Events.DomainEvent> DomainEvents { get; }
    void ClearDomainEvents();
}

/// <summary>
/// Patient entity - core clinical entity
/// </summary>
public class Patient : BaseEntity, IAggregateRoot
{
    public Guid Id { get; private set; }
    public string MRN { get; private set; } = string.Empty;
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public DateTime DateOfBirth { get; private set; }
    public BiologicalSex Sex { get; private set; }
    public string? Phone { get; private set; }
    public string? Email { get; private set; }
    public string? AddressLine1 { get; private set; }
    public string? AddressLine2 { get; private set; }
    public string? City { get; private set; }
    public string? State { get; private set; }
    public string? ZipCode { get; private set; }
    public string PrimaryLanguage { get; private set; } = "English";
    public bool IsActive { get; private set; } = true;
    
    // Navigation properties
    public virtual ICollection<Encounter> Encounters { get; private set; } = new List<Encounter>();
    public virtual ICollection<LabOrder> LabOrders { get; private set; } = new List<LabOrder>();
    public virtual ICollection<Allergy> Allergies { get; private set; } = new List<Allergy>();
    public virtual ICollection<MedicalCondition> Conditions { get; private set; } = new List<MedicalCondition>();
    
    // Age calculation
    public int Age => CalculateAge();
    
    private Patient() { }
    
    public static Patient Create(
        Guid organizationId,
        string mrn,
        string firstName,
        string lastName,
        DateTime dateOfBirth,
        BiologicalSex sex)
    {
        return new Patient
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,   // set at construction — not Guid.Empty
            MRN = mrn,
            FirstName = firstName,
            LastName = lastName,
            DateOfBirth = dateOfBirth,
            Sex = sex
        };
    }
    
    private int CalculateAge()
    {
        // Use UTC date — server local time is not guaranteed to match clinical timezone
        // and can cause off-by-one errors near a birthday (matters for pediatric dosing).
        var today = DateTime.UtcNow.Date;
        var age = today.Year - DateOfBirth.Year;
        if (DateOfBirth.Date > today.AddYears(-age)) age--;
        return age;
    }
    
    public string FullName => $"{FirstName} {LastName}";
}

/// <summary>
/// User entity - providers, nurses, staff
/// </summary>
public class User : BaseEntity, IAggregateRoot
{
    public Guid Id { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public UserRole Role { get; private set; }
    public string? NPI { get; private set; }
    public string? Specialty { get; private set; }
    public string? AzureAdObjectId { get; private set; }
    public bool IsActive { get; private set; } = true;
    
    private User() { }
    
    public static User Create(
        string email,
        string firstName,
        string lastName,
        UserRole role,
        string? npi = null,
        string? specialty = null,
        Guid organizationId = default)
    {
        return new User
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,   // set at construction; StampAuditFields backstop for Guid.Empty
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            Role = role,
            NPI = npi,
            Specialty = specialty
        };
    }
    
    public string FullName => $"{FirstName} {LastName}";
}

/// <summary>
/// Clinical encounter
/// </summary>
public class Encounter : BaseEntity, IAggregateRoot
{
    public Guid Id { get; private set; }
    public Guid PatientId { get; private set; }
    public Guid ProviderId { get; private set; }
    public string EncounterNumber { get; private set; } = string.Empty;
    public string Type { get; private set; } = string.Empty;
    public EncounterStatus Status { get; private set; }
    public string? ChiefComplaint { get; private set; }
    public DateTime? ScheduledAt { get; private set; }
    public DateTime? CheckedInAt { get; private set; }
    public DateTime? StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    
    // Navigation
    public virtual Patient? Patient { get; private set; }
    public virtual User? Provider { get; private set; }
    public virtual ICollection<LabOrder> LabOrders { get; private set; } = new List<LabOrder>();
    
    private Encounter() { }
    
    public static Encounter Create(
        Guid patientId,
        Guid providerId,
        string type,
        DateTime? scheduledAt = null,
        Guid organizationId = default)
    {
        return new Encounter
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,   // set at construction; StampAuditFields backstop for Guid.Empty
            PatientId = patientId,
            ProviderId = providerId,
            EncounterNumber = GenerateEncounterNumber(),
            Type = type,
            Status = EncounterStatus.Scheduled,
            ScheduledAt = scheduledAt
        };
    }
    
    private static string GenerateEncounterNumber()
    {
        return $"ENC-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}";
    }
    
    public void CheckIn()
    {
        Status = EncounterStatus.CheckedIn;
        CheckedInAt = DateTime.UtcNow;
        SetModified();
    }
    
    public void Start(string? chiefComplaint = null)
    {
        Status = EncounterStatus.InProgress;
        StartedAt = DateTime.UtcNow;
        ChiefComplaint = chiefComplaint;
        SetModified();
    }
    
    public void Complete()
    {
        Status = EncounterStatus.Completed;
        CompletedAt = DateTime.UtcNow;
        SetModified();
    }
}

/// <summary>
/// Patient allergy
/// </summary>
public class Allergy : BaseEntity
{
    public Guid Id { get; private set; }
    public Guid PatientId { get; private set; }
    public string Allergen { get; private set; } = string.Empty;
    public string? Reaction { get; private set; }
    public AllergySeverity Severity { get; private set; }
    public bool IsActive { get; private set; } = true;
    
    public virtual Patient? Patient { get; private set; }
    
    private Allergy() { }
    
    public static Allergy Create(
        Guid patientId,
        string allergen,
        AllergySeverity severity,
        string? reaction = null,
        Guid organizationId = default)
    {
        return new Allergy
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,   // set at construction; StampAuditFields backstop for Guid.Empty
            PatientId = patientId,
            Allergen = allergen,
            Severity = severity,
            Reaction = reaction
        };
    }
}

/// <summary>
/// Patient medical condition
/// </summary>
public class MedicalCondition : BaseEntity
{
    public Guid Id { get; private set; }
    public Guid PatientId { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public DateTime? OnsetDate { get; private set; }
    public bool IsActive { get; private set; } = true;
    
    public virtual Patient? Patient { get; private set; }
    
    private MedicalCondition() { }
    
    public static MedicalCondition Create(
        Guid patientId,
        string code,
        string name,
        DateTime? onsetDate = null,
        Guid organizationId = default)
    {
        return new MedicalCondition
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,   // set at construction; StampAuditFields backstop for Guid.Empty
            PatientId = patientId,
            Code = code,
            Name = name,
            OnsetDate = onsetDate
        };
    }
}
