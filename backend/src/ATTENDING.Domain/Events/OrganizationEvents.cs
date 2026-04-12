using ATTENDING.Domain.Enums;

namespace ATTENDING.Domain.Events;

#region Organization Lifecycle Events

public class OrganizationCreatedEvent : DomainEvent
{
    public Guid OrganizationId { get; }
    public string Name { get; }
    public string Slug { get; }

    public OrganizationCreatedEvent(Guid organizationId, string name, string slug)
    {
        OrganizationId = organizationId;
        Name = name;
        Slug = slug;
    }
}

public class OrganizationStatusChangedEvent : DomainEvent
{
    public Guid OrganizationId { get; }
    public OnboardingStatus PreviousStatus { get; }
    public OnboardingStatus NewStatus { get; }

    public OrganizationStatusChangedEvent(
        Guid organizationId, OnboardingStatus previousStatus, OnboardingStatus newStatus)
    {
        OrganizationId = organizationId;
        PreviousStatus = previousStatus;
        NewStatus = newStatus;
    }
}

public class EhrConnectorAddedEvent : DomainEvent
{
    public Guid OrganizationId { get; }
    public Guid ConnectorId { get; }
    public EhrVendor Vendor { get; }

    public EhrConnectorAddedEvent(Guid organizationId, Guid connectorId, EhrVendor vendor)
    {
        OrganizationId = organizationId;
        ConnectorId = connectorId;
        Vendor = vendor;
    }
}

public class EhrConnectionVerifiedEvent : DomainEvent
{
    public Guid OrganizationId { get; }
    public Guid ConnectorId { get; }
    public string VerificationDetails { get; }

    public EhrConnectionVerifiedEvent(Guid organizationId, Guid connectorId, string verificationDetails)
    {
        OrganizationId = organizationId;
        ConnectorId = connectorId;
        VerificationDetails = verificationDetails;
    }
}

public class DataModeChangedEvent : DomainEvent
{
    public Guid OrganizationId { get; }
    public DataMode NewMode { get; }

    public DataModeChangedEvent(Guid organizationId, DataMode newMode)
    {
        OrganizationId = organizationId;
        NewMode = newMode;
    }
}

public class DemoDataSeededEvent : DomainEvent
{
    public Guid OrganizationId { get; }
    public int PatientCount { get; }
    public int EncounterCount { get; }
    public int LabOrderCount { get; }

    public DemoDataSeededEvent(Guid organizationId, int patientCount, int encounterCount, int labOrderCount)
    {
        OrganizationId = organizationId;
        PatientCount = patientCount;
        EncounterCount = encounterCount;
        LabOrderCount = labOrderCount;
    }
}

#endregion
