using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;

namespace ATTENDING.Domain.Entities;

/// <summary>
/// Imaging Order entity
/// </summary>
public class ImagingOrder : BaseEntity, IAggregateRoot
{
    public Guid Id { get; private set; }
    public string OrderNumber { get; private set; } = string.Empty;
    
    // Relationships
    public Guid PatientId { get; private set; }
    public Guid EncounterId { get; private set; }
    public Guid OrderingProviderId { get; private set; }
    
    // Order Details
    public string StudyCode { get; private set; } = string.Empty;
    public string StudyName { get; private set; } = string.Empty;
    public string Modality { get; private set; } = string.Empty; // CT, MRI, X-Ray, Ultrasound
    public string BodyPart { get; private set; } = string.Empty;
    public string? Laterality { get; private set; } // Left, Right, Bilateral
    public bool WithContrast { get; private set; }
    public string CptCode { get; private set; } = string.Empty;
    public OrderPriority Priority { get; private set; }
    public string ClinicalIndication { get; private set; } = string.Empty;
    public string DiagnosisCode { get; private set; } = string.Empty;
    
    // Radiation tracking
    public decimal? EstimatedRadiationDose { get; private set; } // mSv
    
    // Status
    public ImagingOrderStatus Status { get; private set; }
    public DateTime OrderedAt { get; private set; }
    public DateTime? ScheduledAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    
    // Audit — who ordered (supplements base audit fields)
    public Guid OrderedBy { get; private set; }
    
    // Navigation
    public virtual Patient? Patient { get; private set; }
    public virtual Encounter? Encounter { get; private set; }
    public virtual User? OrderingProvider { get; private set; }
    public virtual ImagingResult? Result { get; private set; }
    
    private readonly List<DomainEvent> _domainEvents = new();
    public IReadOnlyCollection<DomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    
    private ImagingOrder() { }
    
    public static ImagingOrder Create(
        Guid patientId,
        Guid encounterId,
        Guid orderingProviderId,
        string studyCode,
        string studyName,
        string modality,
        string bodyPart,
        string cptCode,
        OrderPriority priority,
        string clinicalIndication,
        string diagnosisCode,
        string? laterality = null,
        bool withContrast = false,
        decimal? estimatedRadiationDose = null)
    {
        var order = new ImagingOrder
        {
            Id = Guid.NewGuid(),
            OrderNumber = $"IMG-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}",
            PatientId = patientId,
            EncounterId = encounterId,
            OrderingProviderId = orderingProviderId,
            StudyCode = studyCode,
            StudyName = studyName,
            Modality = modality,
            BodyPart = bodyPart,
            Laterality = laterality,
            WithContrast = withContrast,
            CptCode = cptCode,
            Priority = priority,
            ClinicalIndication = clinicalIndication,
            DiagnosisCode = diagnosisCode,
            EstimatedRadiationDose = estimatedRadiationDose,
            Status = ImagingOrderStatus.Pending,
            OrderedAt = DateTime.UtcNow,
            OrderedBy = orderingProviderId
        };
        
        order._domainEvents.Add(new ImagingOrderCreatedEvent(
            order.Id, patientId, studyName, modality, priority));
        
        return order;
    }
    
    public void Schedule(DateTime scheduledAt)
    {
        Status = ImagingOrderStatus.Scheduled;
        ScheduledAt = scheduledAt;
        SetModified();
    }
    
    public void Complete(ImagingResult result)
    {
        Result = result;
        Status = result.HasCriticalFindings ? ImagingOrderStatus.Final : ImagingOrderStatus.Completed;
        CompletedAt = DateTime.UtcNow;
        SetModified();
        
        _domainEvents.Add(new ImagingOrderCompletedEvent(Id, result.HasCriticalFindings));
    }
    
    public void Cancel()
    {
        if (Status == ImagingOrderStatus.Completed || Status == ImagingOrderStatus.Final)
            throw new InvalidOperationException("Cannot cancel completed imaging orders");
        Status = ImagingOrderStatus.Cancelled;
        SetModified();
    }
    
    public void ClearDomainEvents() => _domainEvents.Clear();
}

/// <summary>
/// Imaging result
/// </summary>
public class ImagingResult : BaseEntity
{
    public Guid Id { get; private set; }
    public Guid ImagingOrderId { get; private set; }
    public string Findings { get; private set; } = string.Empty;
    public string Impression { get; private set; } = string.Empty;
    public bool HasCriticalFindings { get; private set; }
    public string? CriticalFindingsDescription { get; private set; }
    public string? ReadingRadiologist { get; private set; }
    public DateTime ReadAt { get; private set; }
    
    public virtual ImagingOrder? ImagingOrder { get; private set; }
    
    private ImagingResult() { }
    
    public static ImagingResult Create(
        Guid imagingOrderId,
        string findings,
        string impression,
        bool hasCriticalFindings = false,
        string? criticalFindingsDescription = null,
        string? readingRadiologist = null)
    {
        return new ImagingResult
        {
            Id = Guid.NewGuid(),
            ImagingOrderId = imagingOrderId,
            Findings = findings,
            Impression = impression,
            HasCriticalFindings = hasCriticalFindings,
            CriticalFindingsDescription = criticalFindingsDescription,
            ReadingRadiologist = readingRadiologist,
            ReadAt = DateTime.UtcNow
        };
    }
}

/// <summary>
/// Medication Order entity
/// </summary>
public class MedicationOrder : BaseEntity, IAggregateRoot
{
    public Guid Id { get; private set; }
    public string OrderNumber { get; private set; } = string.Empty;
    
    // Relationships
    public Guid PatientId { get; private set; }
    public Guid EncounterId { get; private set; }
    public Guid OrderingProviderId { get; private set; }
    
    // Medication Details
    public string MedicationCode { get; private set; } = string.Empty;
    public string MedicationName { get; private set; } = string.Empty;
    public string GenericName { get; private set; } = string.Empty;
    public string Strength { get; private set; } = string.Empty;
    public string Form { get; private set; } = string.Empty;
    public string Route { get; private set; } = string.Empty;
    public string Frequency { get; private set; } = string.Empty;
    public string Dosage { get; private set; } = string.Empty;
    public int Quantity { get; private set; }
    public int Refills { get; private set; }
    public string? Instructions { get; private set; }
    
    // Clinical
    public string ClinicalIndication { get; private set; } = string.Empty;
    public string DiagnosisCode { get; private set; } = string.Empty;
    public bool IsControlledSubstance { get; private set; }
    public string? DeaSchedule { get; private set; }
    public bool HasBlackBoxWarning { get; private set; }
    
    // Pharmacy
    public string? PharmacyId { get; private set; }
    public string? PharmacyName { get; private set; }
    
    // Status
    public MedicationOrderStatus Status { get; private set; }
    public DateTime OrderedAt { get; private set; }
    public DateTime? DispensedAt { get; private set; }
    public DateTime? DiscontinuedAt { get; private set; }
    public string? DiscontinuedReason { get; private set; }
    
    // Audit — who ordered (supplements base audit fields)
    public Guid OrderedBy { get; private set; }
    
    // Navigation
    public virtual Patient? Patient { get; private set; }
    public virtual Encounter? Encounter { get; private set; }
    public virtual User? OrderingProvider { get; private set; }
    
    private readonly List<DomainEvent> _domainEvents = new();
    public IReadOnlyCollection<DomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    
    private MedicationOrder() { }
    
    public static MedicationOrder Create(
        Guid patientId,
        Guid encounterId,
        Guid orderingProviderId,
        string medicationCode,
        string medicationName,
        string genericName,
        string strength,
        string form,
        string route,
        string frequency,
        string dosage,
        int quantity,
        int refills,
        string clinicalIndication,
        string diagnosisCode,
        string? instructions = null,
        bool isControlledSubstance = false,
        string? deaSchedule = null,
        bool hasBlackBoxWarning = false,
        string? pharmacyId = null,
        string? pharmacyName = null,
        bool hasInteractions = false)
    {
        var order = new MedicationOrder
        {
            Id = Guid.NewGuid(),
            OrderNumber = $"RX-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}",
            PatientId = patientId,
            EncounterId = encounterId,
            OrderingProviderId = orderingProviderId,
            MedicationCode = medicationCode,
            MedicationName = medicationName,
            GenericName = genericName,
            Strength = strength,
            Form = form,
            Route = route,
            Frequency = frequency,
            Dosage = dosage,
            Quantity = quantity,
            Refills = refills,
            Instructions = instructions,
            ClinicalIndication = clinicalIndication,
            DiagnosisCode = diagnosisCode,
            IsControlledSubstance = isControlledSubstance,
            DeaSchedule = deaSchedule,
            HasBlackBoxWarning = hasBlackBoxWarning,
            PharmacyId = pharmacyId,
            PharmacyName = pharmacyName,
            Status = MedicationOrderStatus.Pending,
            OrderedAt = DateTime.UtcNow,
            OrderedBy = orderingProviderId
        };
        
        order._domainEvents.Add(new MedicationOrderCreatedEvent(
            order.Id, patientId, medicationName, hasInteractions));
        
        return order;
    }
    
    public void Activate()
    {
        Status = MedicationOrderStatus.Active;
        SetModified();
    }
    
    public void MarkAsDispensed(DateTime dispensedAt)
    {
        Status = MedicationOrderStatus.Active;
        DispensedAt = dispensedAt;
        SetModified();
    }
    
    public void Discontinue(string reason, Guid discontinuedBy)
    {
        Status = MedicationOrderStatus.Discontinued;
        DiscontinuedAt = DateTime.UtcNow;
        DiscontinuedReason = reason;
        SetModified();
    }
    
    public void ClearDomainEvents() => _domainEvents.Clear();
}

/// <summary>
/// Referral entity
/// </summary>
public class Referral : BaseEntity, IAggregateRoot
{
    public Guid Id { get; private set; }
    public string ReferralNumber { get; private set; } = string.Empty;
    
    // Relationships
    public Guid PatientId { get; private set; }
    public Guid EncounterId { get; private set; }
    public Guid ReferringProviderId { get; private set; }
    
    // Referral Details
    public string Specialty { get; private set; } = string.Empty;
    public UrgencyLevel Urgency { get; private set; }
    public string ClinicalQuestion { get; private set; } = string.Empty;
    public string DiagnosisCode { get; private set; } = string.Empty;
    public string? ReasonForReferral { get; private set; }
    
    // Receiving Provider
    public string? ReferredToProviderId { get; private set; }
    public string? ReferredToProviderName { get; private set; }
    public string? ReferredToFacility { get; private set; }
    public string? ReferredToPhone { get; private set; }
    public string? ReferredToFax { get; private set; }
    
    // Insurance
    public string? InsuranceAuthNumber { get; private set; }
    public DateTime? AuthExpirationDate { get; private set; }
    
    // Status
    public ReferralStatus Status { get; private set; }
    public DateTime ReferredAt { get; private set; }
    public DateTime? ScheduledAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public string? ConsultNotes { get; private set; }
    
    // Audit — who referred (supplements base audit fields)
    public Guid ReferredBy { get; private set; }
    
    // Navigation
    public virtual Patient? Patient { get; private set; }
    public virtual Encounter? Encounter { get; private set; }
    public virtual User? ReferringProvider { get; private set; }
    
    private readonly List<DomainEvent> _domainEvents = new();
    public IReadOnlyCollection<DomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    
    private Referral() { }
    
    public static Referral Create(
        Guid patientId,
        Guid encounterId,
        Guid referringProviderId,
        string specialty,
        UrgencyLevel urgency,
        string clinicalQuestion,
        string diagnosisCode,
        string? reasonForReferral = null,
        string? referredToProviderId = null,
        string? referredToProviderName = null,
        string? referredToFacility = null)
    {
        var referral = new Referral
        {
            Id = Guid.NewGuid(),
            ReferralNumber = $"REF-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}",
            PatientId = patientId,
            EncounterId = encounterId,
            ReferringProviderId = referringProviderId,
            Specialty = specialty,
            Urgency = urgency,
            ClinicalQuestion = clinicalQuestion,
            DiagnosisCode = diagnosisCode,
            ReasonForReferral = reasonForReferral,
            ReferredToProviderId = referredToProviderId,
            ReferredToProviderName = referredToProviderName,
            ReferredToFacility = referredToFacility,
            Status = ReferralStatus.Pending,
            ReferredAt = DateTime.UtcNow,
            ReferredBy = referringProviderId
        };
        
        referral._domainEvents.Add(new ReferralCreatedEvent(
            referral.Id, patientId, specialty, urgency));
        
        return referral;
    }
    
    public void MarkAsSent()
    {
        Status = ReferralStatus.Sent;
        SetModified();
    }
    
    public void Schedule(DateTime scheduledAt)
    {
        Status = ReferralStatus.Scheduled;
        ScheduledAt = scheduledAt;
        SetModified();
    }
    
    public void Complete(string? consultNotes = null)
    {
        Status = ReferralStatus.Completed;
        CompletedAt = DateTime.UtcNow;
        ConsultNotes = consultNotes;
        SetModified();
    }
    
    public void SetInsuranceAuthorization(string authNumber, DateTime? expirationDate)
    {
        InsuranceAuthNumber = authNumber;
        AuthExpirationDate = expirationDate;
        SetModified();
    }

    public void Cancel()
    {
        Status = ReferralStatus.Cancelled;
        SetModified();
    }
    
    public void ClearDomainEvents() => _domainEvents.Clear();
}
