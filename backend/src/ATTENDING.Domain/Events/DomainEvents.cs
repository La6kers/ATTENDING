using ATTENDING.Domain.Enums;

namespace ATTENDING.Domain.Events;

/// <summary>
/// Base class for all domain events
/// </summary>
public abstract class DomainEvent
{
    public Guid Id { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
    public string EventType => GetType().Name;
}

#region Lab Order Events

/// <summary>
/// Raised when a lab order is created
/// </summary>
public class LabOrderCreatedEvent : DomainEvent
{
    public Guid LabOrderId { get; }
    public Guid PatientId { get; }
    public string TestCode { get; }
    public OrderPriority Priority { get; }
    public bool IsStatFromRedFlag { get; }
    
    public LabOrderCreatedEvent(
        Guid labOrderId,
        Guid patientId,
        string testCode,
        OrderPriority priority,
        bool isStatFromRedFlag)
    {
        LabOrderId = labOrderId;
        PatientId = patientId;
        TestCode = testCode;
        Priority = priority;
        IsStatFromRedFlag = isStatFromRedFlag;
    }
}

/// <summary>
/// Raised when a lab order is upgraded to STAT due to red flag
/// </summary>
public class LabOrderUpgradedToStatEvent : DomainEvent
{
    public Guid LabOrderId { get; }
    public OrderPriority PreviousPriority { get; }
    public string Reason { get; }
    
    public LabOrderUpgradedToStatEvent(Guid labOrderId, OrderPriority previousPriority, string reason)
    {
        LabOrderId = labOrderId;
        PreviousPriority = previousPriority;
        Reason = reason;
    }
}

/// <summary>
/// Raised when a lab specimen is collected
/// </summary>
public class LabOrderCollectedEvent : DomainEvent
{
    public Guid LabOrderId { get; }
    public DateTime CollectedAt { get; }
    
    public LabOrderCollectedEvent(Guid labOrderId, DateTime collectedAt)
    {
        LabOrderId = labOrderId;
        CollectedAt = collectedAt;
    }
}

/// <summary>
/// Raised when lab results are available
/// </summary>
public class LabOrderResultedEvent : DomainEvent
{
    public Guid LabOrderId { get; }
    public bool IsCritical { get; }
    
    public LabOrderResultedEvent(Guid labOrderId, bool isCritical)
    {
        LabOrderId = labOrderId;
        IsCritical = isCritical;
    }
}

/// <summary>
/// Raised when a lab order is cancelled
/// </summary>
public class LabOrderCancelledEvent : DomainEvent
{
    public Guid LabOrderId { get; }
    public Guid CancelledBy { get; }
    public string Reason { get; }
    
    public LabOrderCancelledEvent(Guid labOrderId, Guid cancelledBy, string reason)
    {
        LabOrderId = labOrderId;
        CancelledBy = cancelledBy;
        Reason = reason;
    }
}

/// <summary>
/// Raised when lab order priority changes
/// </summary>
public class LabOrderPriorityChangedEvent : DomainEvent
{
    public Guid LabOrderId { get; }
    public OrderPriority PreviousPriority { get; }
    public OrderPriority NewPriority { get; }
    
    public LabOrderPriorityChangedEvent(Guid labOrderId, OrderPriority previousPriority, OrderPriority newPriority)
    {
        LabOrderId = labOrderId;
        PreviousPriority = previousPriority;
        NewPriority = newPriority;
    }
}

#endregion

#region Imaging Order Events

/// <summary>
/// Raised when an imaging order is created
/// </summary>
public class ImagingOrderCreatedEvent : DomainEvent
{
    public Guid ImagingOrderId { get; }
    public Guid PatientId { get; }
    public string StudyType { get; }
    public string Modality { get; }
    public OrderPriority Priority { get; }
    
    public ImagingOrderCreatedEvent(
        Guid imagingOrderId,
        Guid patientId,
        string studyType,
        string modality,
        OrderPriority priority)
    {
        ImagingOrderId = imagingOrderId;
        PatientId = patientId;
        StudyType = studyType;
        Modality = modality;
        Priority = priority;
    }
}

/// <summary>
/// Raised when imaging is completed
/// </summary>
public class ImagingOrderCompletedEvent : DomainEvent
{
    public Guid ImagingOrderId { get; }
    public bool HasCriticalFindings { get; }
    
    public ImagingOrderCompletedEvent(Guid imagingOrderId, bool hasCriticalFindings)
    {
        ImagingOrderId = imagingOrderId;
        HasCriticalFindings = hasCriticalFindings;
    }
}

#endregion

#region Medication Order Events

/// <summary>
/// Raised when a medication order is created
/// </summary>
public class MedicationOrderCreatedEvent : DomainEvent
{
    public Guid MedicationOrderId { get; }
    public Guid PatientId { get; }
    public string MedicationName { get; }
    public bool HasInteractions { get; }
    
    public MedicationOrderCreatedEvent(
        Guid medicationOrderId,
        Guid patientId,
        string medicationName,
        bool hasInteractions)
    {
        MedicationOrderId = medicationOrderId;
        PatientId = patientId;
        MedicationName = medicationName;
        HasInteractions = hasInteractions;
    }
}

/// <summary>
/// Raised when a drug interaction is detected
/// </summary>
public class DrugInteractionDetectedEvent : DomainEvent
{
    public Guid MedicationOrderId { get; }
    public Guid PatientId { get; }
    public string Drug1 { get; }
    public string Drug2 { get; }
    public string Severity { get; }
    public string Description { get; }
    
    public DrugInteractionDetectedEvent(
        Guid medicationOrderId,
        Guid patientId,
        string drug1,
        string drug2,
        string severity,
        string description)
    {
        MedicationOrderId = medicationOrderId;
        PatientId = patientId;
        Drug1 = drug1;
        Drug2 = drug2;
        Severity = severity;
        Description = description;
    }
}

#endregion

#region Referral Events

/// <summary>
/// Raised when a referral is created
/// </summary>
public class ReferralCreatedEvent : DomainEvent
{
    public Guid ReferralId { get; }
    public Guid PatientId { get; }
    public string Specialty { get; }
    public UrgencyLevel Urgency { get; }
    
    public ReferralCreatedEvent(
        Guid referralId,
        Guid patientId,
        string specialty,
        UrgencyLevel urgency)
    {
        ReferralId = referralId;
        PatientId = patientId;
        Specialty = specialty;
        Urgency = urgency;
    }
}

#endregion

#region Assessment Events

/// <summary>
/// Raised when an assessment is started
/// </summary>
public class AssessmentStartedEvent : DomainEvent
{
    public Guid AssessmentId { get; }
    public Guid PatientId { get; }
    
    public AssessmentStartedEvent(Guid assessmentId, Guid patientId)
    {
        AssessmentId = assessmentId;
        PatientId = patientId;
    }
}

/// <summary>
/// Raised when a red flag is detected during assessment
/// </summary>
public class RedFlagDetectedEvent : DomainEvent
{
    public Guid AssessmentId { get; }
    public Guid PatientId { get; }
    public string Category { get; }
    public RedFlagSeverity Severity { get; }
    public string Reason { get; }
    
    public RedFlagDetectedEvent(
        Guid assessmentId,
        Guid patientId,
        string category,
        RedFlagSeverity severity,
        string reason)
    {
        AssessmentId = assessmentId;
        PatientId = patientId;
        Category = category;
        Severity = severity;
        Reason = reason;
    }
}

/// <summary>
/// Raised when an assessment is completed
/// </summary>
public class AssessmentCompletedEvent : DomainEvent
{
    public Guid AssessmentId { get; }
    public Guid PatientId { get; }
    public TriageLevel TriageLevel { get; }
    public bool HasRedFlags { get; }
    
    public AssessmentCompletedEvent(
        Guid assessmentId,
        Guid patientId,
        TriageLevel triageLevel,
        bool hasRedFlags)
    {
        AssessmentId = assessmentId;
        PatientId = patientId;
        TriageLevel = triageLevel;
        HasRedFlags = hasRedFlags;
    }
}

/// <summary>
/// Raised when emergency protocol is triggered
/// </summary>
public class EmergencyProtocolTriggeredEvent : DomainEvent
{
    public Guid AssessmentId { get; }
    public Guid PatientId { get; }
    public string Reason { get; }
    public string RecommendedAction { get; }
    
    public EmergencyProtocolTriggeredEvent(
        Guid assessmentId,
        Guid patientId,
        string reason,
        string recommendedAction)
    {
        AssessmentId = assessmentId;
        PatientId = patientId;
        Reason = reason;
        RecommendedAction = recommendedAction;
    }
}

#endregion

#region Audit Events

/// <summary>
/// Raised for PHI access logging
/// </summary>
public class PhiAccessedEvent : DomainEvent
{
    public Guid UserId { get; }
    public Guid PatientId { get; }
    public string AccessType { get; }
    public string ResourceType { get; }
    public Guid? ResourceId { get; }
    public string? Reason { get; }
    
    public PhiAccessedEvent(
        Guid userId,
        Guid patientId,
        string accessType,
        string resourceType,
        Guid? resourceId = null,
        string? reason = null)
    {
        UserId = userId;
        PatientId = patientId;
        AccessType = accessType;
        ResourceType = resourceType;
        ResourceId = resourceId;
        Reason = reason;
    }
}

#endregion
