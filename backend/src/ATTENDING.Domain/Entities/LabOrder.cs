using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;
using ATTENDING.Domain.Services;
using ATTENDING.Domain.ValueObjects;

namespace ATTENDING.Domain.Entities;

/// <summary>
/// Lab Order aggregate root - represents a clinical laboratory order
/// </summary>
public class LabOrder : BaseEntity, IAggregateRoot, IHasDomainEvents
{
    // Identity
    public Guid Id { get; private set; }
    public string OrderNumber { get; private set; } = string.Empty;
    
    // Relationships
    public Guid PatientId { get; private set; }
    public Guid EncounterId { get; private set; }
    public Guid OrderingProviderId { get; private set; }
    
    // Order Details
    public string TestCode { get; private set; } = string.Empty;
    public string TestName { get; private set; } = string.Empty;
    public string CptCode { get; private set; } = string.Empty;
    public string? CptDescription { get; private set; }
    public decimal? CptBasePrice { get; private set; }
    public string LoincCode { get; private set; } = string.Empty;
    public string Category { get; private set; } = string.Empty;
    public OrderPriority Priority { get; private set; }
    public string ClinicalIndication { get; private set; } = string.Empty;
    public string DiagnosisCode { get; private set; } = string.Empty;
    public string? DiagnosisDescription { get; private set; }
    
    // Clinical Flags
    public bool RequiresFasting { get; private set; }
    public bool IsStatFromRedFlag { get; private set; }
    public string? RedFlagReason { get; private set; }
    
    // Status
    public LabOrderStatus Status { get; private set; }
    public DateTime OrderedAt { get; private set; }
    public DateTime? CollectedAt { get; private set; }
    public DateTime? ResultedAt { get; private set; }
    
    // Audit — who ordered/modified (supplements base audit fields)
    public Guid OrderedBy { get; private set; }
    public Guid? LastModifiedBy { get; private set; }
    
    // Navigation properties
    public virtual Patient? Patient { get; private set; }
    public virtual Encounter? Encounter { get; private set; }
    public virtual User? OrderingProvider { get; private set; }
    public virtual LabResult? Result { get; private set; }
    
    // Domain events
    private readonly List<DomainEvent> _domainEvents = new();
    public IReadOnlyCollection<DomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    
    // Private constructor for EF Core
    private LabOrder() { }
    
    /// <summary>
    /// Factory method to create a new lab order with business rule enforcement
    /// </summary>
    public static LabOrder Create(
        Guid patientId,
        Guid encounterId,
        Guid orderingProviderId,
        string testCode,
        string testName,
        string cptCode,
        string loincCode,
        string category,
        OrderPriority priority,
        string clinicalIndication,
        string diagnosisCode,
        bool requiresFasting,
        RedFlagEvaluation? redFlagEvaluation = null,
        string? cptDescription = null,
        decimal? cptBasePrice = null,
        string? diagnosisDescription = null)
    {
        if (string.IsNullOrWhiteSpace(testCode))
            throw new ArgumentException("Test code is required", nameof(testCode));
        if (string.IsNullOrWhiteSpace(clinicalIndication))
            throw new ArgumentException("Clinical indication is required", nameof(clinicalIndication));
            
        var order = new LabOrder
        {
            Id = Guid.NewGuid(),
            OrderNumber = GenerateOrderNumber(),
            PatientId = patientId,
            EncounterId = encounterId,
            OrderingProviderId = orderingProviderId,
            TestCode = testCode,
            TestName = testName,
            CptCode = cptCode,
            CptDescription = cptDescription,
            CptBasePrice = cptBasePrice,
            LoincCode = loincCode,
            Category = category,
            Priority = priority,
            ClinicalIndication = clinicalIndication,
            DiagnosisCode = diagnosisCode,
            DiagnosisDescription = diagnosisDescription,
            RequiresFasting = requiresFasting,
            Status = LabOrderStatus.Pending,
            OrderedAt = DateTime.UtcNow,
            OrderedBy = orderingProviderId
        };
        
        // Apply red flag upgrade if detected
        if (redFlagEvaluation?.HasRedFlags == true)
        {
            order.UpgradeToStatForRedFlag(redFlagEvaluation.Reason);
        }
        
        // Raise domain event
        order._domainEvents.Add(new LabOrderCreatedEvent(
            order.Id,
            order.PatientId,
            order.TestCode,
            order.Priority,
            order.IsStatFromRedFlag));
        
        return order;
    }
    
    /// <summary>
    /// Upgrade order to STAT priority due to red flag detection
    /// </summary>
    public void UpgradeToStatForRedFlag(string reason)
    {
        if (Priority == OrderPriority.Stat)
            return;
            
        var previousPriority = Priority;
        Priority = OrderPriority.Stat;
        IsStatFromRedFlag = true;
        RedFlagReason = reason;
        SetModified();
        
        _domainEvents.Add(new LabOrderUpgradedToStatEvent(Id, previousPriority, reason));
    }
    
    /// <summary>
    /// Mark order as collected (specimen obtained)
    /// </summary>
    public void MarkAsCollected(DateTime collectedAt)
    {
        if (Status != LabOrderStatus.Pending)
            throw new InvalidOperationException("Can only mark pending orders as collected");
            
        Status = LabOrderStatus.Collected;
        CollectedAt = collectedAt;
        SetModified();
        
        _domainEvents.Add(new LabOrderCollectedEvent(Id, collectedAt));
    }
    
    /// <summary>
    /// Add result to order
    /// </summary>
    public void AddResult(LabResult result)
    {
        if (Status != LabOrderStatus.Collected && Status != LabOrderStatus.Processing)
            throw new InvalidOperationException("Can only add results to collected or processing orders");
            
        Result = result;
        Status = result.IsCritical ? LabOrderStatus.CriticalResult : LabOrderStatus.Resulted;
        ResultedAt = DateTime.UtcNow;
        SetModified();
        
        _domainEvents.Add(new LabOrderResultedEvent(Id, result.IsCritical));
    }
    
    /// <summary>
    /// Cancel the order
    /// </summary>
    public void Cancel(Guid cancelledBy, string reason)
    {
        if (Status == LabOrderStatus.Collected || Status == LabOrderStatus.Resulted || 
            Status == LabOrderStatus.CriticalResult)
            throw new InvalidOperationException("Cannot cancel orders that have been collected or resulted");
            
        Status = LabOrderStatus.Cancelled;
        LastModifiedBy = cancelledBy;
        SetModified();
        
        _domainEvents.Add(new LabOrderCancelledEvent(Id, cancelledBy, reason));
    }
    
    /// <summary>
    /// Update priority
    /// </summary>
    public void UpdatePriority(OrderPriority newPriority, Guid modifiedBy)
    {
        if (Status != LabOrderStatus.Pending)
            throw new InvalidOperationException("Can only update priority of pending orders");
            
        var previousPriority = Priority;
        Priority = newPriority;
        LastModifiedBy = modifiedBy;
        SetModified();
        
        _domainEvents.Add(new LabOrderPriorityChangedEvent(Id, previousPriority, newPriority));
    }
    
    private static string GenerateOrderNumber()
    {
        return $"LAB-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}";
    }
    
    public void ClearDomainEvents() => _domainEvents.Clear();
}

/// <summary>
/// Lab result entity
/// </summary>
public class LabResult : BaseEntity
{
    public Guid Id { get; private set; }
    public Guid LabOrderId { get; private set; }
    public string Value { get; private set; } = string.Empty;
    public string? Unit { get; private set; }
    public decimal? ReferenceRangeLow { get; private set; }
    public decimal? ReferenceRangeHigh { get; private set; }
    public string? ReferenceRangeText { get; private set; }
    public string? Interpretation { get; private set; }
    public bool IsCritical { get; private set; }
    public DateTime? CriticalNotifiedAt { get; private set; }
    public Guid? CriticalNotifiedTo { get; private set; }
    public string? PerformingLab { get; private set; }
    public DateTime ResultedAt { get; private set; }
    public string? ResultedBy { get; private set; }
    public string? Comments { get; private set; }
    
    // Navigation
    public virtual LabOrder? LabOrder { get; private set; }
    
    private LabResult() { }
    
    public static LabResult Create(
        Guid labOrderId,
        string value,
        string? unit = null,
        decimal? refLow = null,
        decimal? refHigh = null,
        string? interpretation = null,
        bool isCritical = false,
        string? performingLab = null,
        string? resultedBy = null,
        string? comments = null)
    {
        return new LabResult
        {
            Id = Guid.NewGuid(),
            LabOrderId = labOrderId,
            Value = value,
            Unit = unit,
            ReferenceRangeLow = refLow,
            ReferenceRangeHigh = refHigh,
            Interpretation = interpretation,
            IsCritical = isCritical,
            PerformingLab = performingLab,
            ResultedAt = DateTime.UtcNow,
            ResultedBy = resultedBy,
            Comments = comments
        };
    }
    
    public void MarkCriticalNotified(Guid notifiedTo)
    {
        CriticalNotifiedAt = DateTime.UtcNow;
        CriticalNotifiedTo = notifiedTo;
        SetModified();
    }
}

