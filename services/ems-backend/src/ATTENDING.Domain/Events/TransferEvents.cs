// =============================================================================
// P16: SNF-to-Hospital Transfer Domain Events
// =============================================================================
//
// Domain events raised during the SNF-to-Hospital transfer lifecycle.
// Consumed by application-layer handlers for notifications, audit logging,
// and cross-cutting concerns (e.g., SignalR real-time updates).
//
// @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md
// =============================================================================

namespace ATTENDING.Domain.Events;

using ATTENDING.Domain.Entities;

/// <summary>
/// Base class for all transfer-related domain events.
/// </summary>
public abstract record TransferDomainEvent
{
    public string EventId { get; init; } = Guid.NewGuid().ToString();
    public DateTime OccurredAt { get; init; } = DateTime.UtcNow;
    public string TransferRequestId { get; init; } = string.Empty;
    public string PatientId { get; init; } = string.Empty;
    public string OrganizationId { get; init; } = string.Empty;
}

// ---------------------------------------------------------------------------
// Transfer Lifecycle Events
// ---------------------------------------------------------------------------

/// <summary>
/// Raised when a new SNF-to-Hospital transfer is initiated.
/// </summary>
public record TransferInitiatedEvent : TransferDomainEvent
{
    public TransferUrgency UrgencyLevel { get; init; }
    public TransferMode Mode { get; init; }
    public string ReasonForTransfer { get; init; } = string.Empty;
    public string SendingFacilityId { get; init; } = string.Empty;
    public string ReceivingFacilityId { get; init; } = string.Empty;
    public string? InitiatedBy { get; init; }
}

/// <summary>
/// Raised when data collection begins for a transfer.
/// </summary>
public record DataCollectionStartedEvent : TransferDomainEvent
{
    public TransferMode Mode { get; init; }
    public int RequiredSectionCount { get; init; }
}

/// <summary>
/// Raised when an INTERACT section is completed during data collection.
/// </summary>
public record SectionCompletedEvent : TransferDomainEvent
{
    public string SectionId { get; init; } = string.Empty;
    public int CompletedFields { get; init; }
    public int TotalFields { get; init; }
    public string? CompletedBy { get; init; }
}

// ---------------------------------------------------------------------------
// MAR Reconciliation Events
// ---------------------------------------------------------------------------

/// <summary>
/// Raised when MAR reconciliation is initiated for a transfer.
/// </summary>
public record MARReconciliationStartedEvent : TransferDomainEvent
{
    public int TotalMedications { get; init; }
    public string? InitiatedBy { get; init; }
}

/// <summary>
/// Raised when a critical medication discrepancy is detected.
/// Triggers pharmacist review notification.
/// </summary>
public record CriticalDiscrepancyDetectedEvent : TransferDomainEvent
{
    public string DiscrepancyId { get; init; } = string.Empty;
    public DiscrepancyType DiscrepancyType { get; init; }
    public string MedicationName { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string? InteractingMedication { get; init; }
}

/// <summary>
/// Raised when MAR reconciliation is completed (all discrepancies resolved).
/// </summary>
public record MARReconciliationCompletedEvent : TransferDomainEvent
{
    public int TotalMedications { get; init; }
    public int DiscrepancyCount { get; init; }
    public int CriticalCount { get; init; }
    public int ResolvedCount { get; init; }
    public bool PharmacistReviewed { get; init; }
    public bool ProviderReviewed { get; init; }
    public string? CompletedBy { get; init; }
}

// ---------------------------------------------------------------------------
// Document Events
// ---------------------------------------------------------------------------

/// <summary>
/// Raised when the INTERACT transfer document is generated.
/// </summary>
public record InteractDocumentGeneratedEvent : TransferDomainEvent
{
    public string DocumentId { get; init; } = string.Empty;
    public double ComplianceScore { get; init; }
    public int CompletedSections { get; init; }
    public int TotalSections { get; init; }
    public TransferMode Mode { get; init; }
}

/// <summary>
/// Raised when the transfer document is transmitted to the receiving hospital.
/// </summary>
public record TransferDocumentTransmittedEvent : TransferDomainEvent
{
    public string DocumentId { get; init; } = string.Empty;
    public string ReceivingFacilityId { get; init; } = string.Empty;
    public string TransmissionMethod { get; init; } = string.Empty; // SignalR, HL7, Fax
    public DateTime TransmittedAt { get; init; }
}

/// <summary>
/// Raised when the receiving hospital acknowledges document receipt.
/// </summary>
public record HospitalAcknowledgmentReceivedEvent : TransferDomainEvent
{
    public string ReceivingFacilityId { get; init; } = string.Empty;
    public string? ReceivingPhysician { get; init; }
    public string? AssignedRoom { get; init; }
    public bool IsolationRoomAssigned { get; init; }
    public DateTime AcknowledgedAt { get; init; }
}

// ---------------------------------------------------------------------------
// Quality Events
// ---------------------------------------------------------------------------

/// <summary>
/// Raised when a transfer matches a CMS Potentially Preventable Readmission
/// diagnosis category. Routes to SNF medical director for quality review.
/// </summary>
public record PPRFlagRaisedEvent : TransferDomainEvent
{
    public string DiagnosisCategory { get; init; } = string.Empty;
    public List<string> MatchedIcd10Codes { get; init; } = new();
    public int DaysSinceLastDischarge { get; init; }
    public int DaysSinceSNFAdmission { get; init; }
    public bool IsWithin30DayWindow { get; init; }
}

// ---------------------------------------------------------------------------
// Transport Events
// ---------------------------------------------------------------------------

/// <summary>
/// Raised when the patient departs the SNF.
/// </summary>
public record PatientDepartedEvent : TransferDomainEvent
{
    public DateTime DepartedAt { get; init; }
    public string TransportMode { get; init; } = string.Empty;
    public string? TransportUnit { get; init; }
}

/// <summary>
/// Raised when the patient arrives at the receiving hospital.
/// Marks transfer completion.
/// </summary>
public record PatientArrivedEvent : TransferDomainEvent
{
    public DateTime ArrivedAt { get; init; }
    public string ReceivingFacilityId { get; init; } = string.Empty;
    public TimeSpan TotalTransferDuration { get; init; }
    public TimeSpan DocumentLeadTime { get; init; } // Time between document receipt and patient arrival
}

/// <summary>
/// Raised when a transfer is cancelled.
/// </summary>
public record TransferCancelledEvent : TransferDomainEvent
{
    public string CancelledBy { get; init; } = string.Empty;
    public string CancellationReason { get; init; } = string.Empty;
    public TransferStatus StatusAtCancellation { get; init; }
}
