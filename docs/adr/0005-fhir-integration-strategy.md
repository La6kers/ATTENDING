# ADR-0005: Multi-Vendor FHIR R4 Integration Strategy

**Status:** Accepted  
**Date:** 2026-02-24  
**Decision Makers:** Engineering Team

## Context

ATTENDING AI integrates with multiple Electronic Health Record (EHR) systems to exchange clinical data:

1. **Epic** (Market leader; used by ~40% of U.S. hospitals)
2. **Oracle Health (Cerner)** (Second largest; ~25% market share)
3. **athenahealth** (Dominant in ambulatory/independent practices; ~20%)

Each EHR has:
- Different FHIR R4 implementation quirks (custom extensions, missing fields, timestamp formats)
- Different authentication schemes (OAuth2.0, API keys, mTLS certificates)
- Different data availability: Epic has robust Appointments API; Cerner's is limited
- Rate limits, API versions, and deprecation schedules

Simply writing vendor-specific integration code in each handler would lead to:
- Duplicated FHIR deserialization logic
- Vendor-specific error handling scattered throughout codebase
- Hard to add new vendor (10+ files to modify)
- Hard to test (need vendor sandbox accounts)

## Decision

Implement **vendor-agnostic FHIR integration** using an abstraction factory pattern with vendor-specific plugins:

### IFhirClient Interface (Vendor-Agnostic)

```csharp
namespace ATTENDING.Core.Fhir;

public interface IFhirClient
{
    Task<PatientDto> GetPatientAsync(string patientId, CancellationToken ct = default);
    Task<List<AppointmentDto>> GetUpcomingAppointmentsAsync(
        string patientId,
        DateTime from,
        DateTime to,
        CancellationToken ct = default
    );
    Task<List<ClinicalNoteDto>> GetClinicalNotesAsync(
        string patientId,
        DateTime from,
        DateTime to,
        CancellationToken ct = default
    );
    Task<ReferralDto> CreateReferralAsync(ReferralCreateRequest request, CancellationToken ct = default);
    Task<bool> UpdateAppointmentStatusAsync(
        string appointmentId,
        AppointmentStatus status,
        CancellationToken ct = default
    );
}

public record PatientDto(
    string Id,
    string FirstName,
    string LastName,
    DateTime DateOfBirth,
    string Gender,
    string? Phone,
    string? Email
);

public record AppointmentDto(
    string Id,
    string PatientId,
    DateTime Start,
    DateTime End,
    string? Description,
    AppointmentStatus Status,
    string? ProviderId
);
```

### Vendor-Specific Implementations

```csharp
// Epic-specific implementation
public class EpicFhirClient : IFhirClient
{
    private readonly HttpClient _httpClient;
    private readonly EpicConfiguration _config;
    private readonly ILogger<EpicFhirClient> _logger;

    public async Task<PatientDto> GetPatientAsync(string patientId, CancellationToken ct = default)
    {
        // Epic's Patient resource: handles Epic-specific extensions like `ext-race`
        var response = await _httpClient.GetAsync($"/api/FHIR/R4/Patient/{patientId}", ct);
        var fhirPatient = await response.Content.ReadAsAsync<Hl7.Fhir.Model.Patient>(ct);
        
        return MapEpicPatientToDto(fhirPatient);
    }

    public async Task<List<AppointmentDto>> GetUpcomingAppointmentsAsync(
        string patientId,
        DateTime from,
        DateTime to,
        CancellationToken ct = default)
    {
        // Epic's Appointments API: requires `start` and `end` query parameters
        var bundle = await _httpClient.GetAsync(
            $"/api/FHIR/R4/Appointment?" +
            $"patient={patientId}&" +
            $"start=ge{from:yyyy-MM-dd}&" +
            $"start=le{to:yyyy-MM-dd}",
            ct
        );
        
        var fhirBundle = await bundle.Content.ReadAsAsync<Hl7.Fhir.Model.Bundle>(ct);
        return fhirBundle.Entry
            .Select(e => (Hl7.Fhir.Model.Appointment)e.Resource)
            .Select(MapEpicAppointmentToDto)
            .ToList();
    }

    private PatientDto MapEpicPatientToDto(Hl7.Fhir.Model.Patient fhirPatient)
    {
        // Epic-specific mapping: handle Epic's extensions like `ext-patient-race`
        var race = fhirPatient.GetExtension("http://hl7.org/fhir/us/core/StructureDefinition/us-core-race");
        var ethnicity = fhirPatient.GetExtension("http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity");
        
        return new PatientDto(
            Id: fhirPatient.Id,
            FirstName: fhirPatient.Name.FirstOrDefault()?.Given.FirstOrDefault(),
            LastName: fhirPatient.Name.FirstOrDefault()?.Family,
            DateOfBirth: fhirPatient.BirthDate.HasValue 
                ? DateTime.Parse(fhirPatient.BirthDate)
                : DateTime.MinValue,
            Gender: fhirPatient.Gender?.ToString() ?? "Unknown",
            Phone: fhirPatient.Telecom?.FirstOrDefault(t => t.System == ContactPoint.ContactPointSystem.Phone)?.Value,
            Email: fhirPatient.Telecom?.FirstOrDefault(t => t.System == ContactPoint.ContactPointSystem.Email)?.Value
        );
    }
}

// Cerner (Oracle Health) implementation
public class CernerFhirClient : IFhirClient
{
    // Cerner's FHIR implementation has different quirks:
    // - Appointments API is limited; must query through Encounter
    // - Different timestamp formats
    // - Requires X.509 certificate authentication
    
    public async Task<PatientDto> GetPatientAsync(string patientId, CancellationToken ct = default)
    {
        // Cerner uses different API endpoints and response structures
        var response = await _httpClient.GetAsync($"Patient/{patientId}", ct);
        var fhirPatient = await response.Content.ReadAsAsync<Hl7.Fhir.Model.Patient>(ct);
        
        return MapCernerPatientToDto(fhirPatient);
    }
    
    // Cerner's appointment access is limited; workaround via Encounter
    public async Task<List<AppointmentDto>> GetUpcomingAppointmentsAsync(
        string patientId,
        DateTime from,
        DateTime to,
        CancellationToken ct = default)
    {
        // Cerner limitation: retrieve encounters instead
        var encounters = await GetEncountersAsync(patientId, from, to, ct);
        return encounters.Select(MapCernerEncounterToAppointmentDto).ToList();
    }
}

// athenahealth implementation
public class AthenaFhirClient : IFhirClient
{
    // athenahealth targets ambulatory practices; focus on:
    // - Patient demographics
    // - Provider schedules
    // - Referrals
    
    public async Task<PatientDto> GetPatientAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _httpClient.GetAsync($"Patient/{patientId}", ct);
        var fhirPatient = await response.Content.ReadAsAsync<Hl7.Fhir.Model.Patient>(ct);
        
        return MapAthenaPatientToDto(fhirPatient);
    }
}
```

### IFhirClientFactory (Dynamic Resolution)

```csharp
public interface IFhirClientFactory
{
    Task<IFhirClient> GetClientForOrganizationAsync(Guid organizationId, CancellationToken ct = default);
}

public class FhirClientFactory : IFhirClientFactory
{
    private readonly IConfiguration _config;
    private readonly IOrganizationRepository _orgRepository;
    private readonly ILogger<FhirClientFactory> _logger;

    public async Task<IFhirClient> GetClientForOrganizationAsync(Guid organizationId, CancellationToken ct = default)
    {
        // Retrieve organization's EHR configuration from database
        var org = await _orgRepository.GetByIdAsync(organizationId, ct);
        
        return org.EhrVendor switch
        {
            EhrVendor.Epic => CreateEpicClient(org.EhrConfiguration),
            EhrVendor.Cerner => CreateCernerClient(org.EhrConfiguration),
            EhrVendor.Athena => CreateAthenaClient(org.EhrConfiguration),
            _ => throw new NotSupportedException($"EHR vendor {org.EhrVendor} not supported")
        };
    }

    private IFhirClient CreateEpicClient(EhrConfiguration config)
    {
        var httpClient = new HttpClient()
        {
            BaseAddress = new Uri(config.FhirBaseUrl),
            DefaultRequestHeaders = { { "Authorization", $"Bearer {config.AccessToken}" } }
        };
        
        return new EpicFhirClient(httpClient, _logger);
    }

    private IFhirClient CreateCernerClient(EhrConfiguration config)
    {
        var handler = new HttpClientHandler();
        var cert = new X509Certificate2(Convert.FromBase64String(config.ClientCertificate));
        handler.ClientCertificates.Add(cert);
        
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri(config.FhirBaseUrl)
        };
        
        return new CernerFhirClient(httpClient, _logger);
    }

    private IFhirClient CreateAthenaClient(EhrConfiguration config)
    {
        var httpClient = new HttpClient()
        {
            BaseAddress = new Uri(config.FhirBaseUrl),
            DefaultRequestHeaders = { { "Authorization", $"Bearer {config.AccessToken}" } }
        };
        
        return new AthenaFhirClient(httpClient, _logger);
    }
}
```

### Usage in Command Handlers

```csharp
public class SendReferralCommand : IRequest<ReferralResult>
{
    public Guid OrderId { get; set; }
    public Guid OrganizationId { get; set; }
}

public class SendReferralHandler : IRequestHandler<SendReferralCommand, ReferralResult>
{
    private readonly IFhirClientFactory _fhirFactory;
    private readonly IOrderRepository _orderRepository;

    public async Task<ReferralResult> Handle(SendReferralCommand request, CancellationToken ct)
    {
        // Factory hides vendor-specific details
        var fhirClient = await _fhirFactory.GetClientForOrganizationAsync(request.OrganizationId, ct);
        
        var order = await _orderRepository.GetByIdAsync(request.OrderId, ct);
        
        // Call vendor-agnostic interface
        var referralResponse = await fhirClient.CreateReferralAsync(
            new ReferralCreateRequest(
                PatientId: order.PatientId.ToString(),
                ReferralReason: order.OrderReason,
                TargetSpecialty: order.SpecialtyCode
            ),
            ct
        );

        return new ReferralResult(Success: true, ReferralId: referralResponse.Id);
    }
}
```

## Consequences

### Positive
- **Vendor Agnostic**: Handlers call `IFhirClient` without knowing vendor details
- **Easy to Add Vendor**: Create new `XyzFhirClient : IFhirClient` without touching handlers
- **Testable**: Mock `IFhirClient` in unit tests; use test implementations
- **Extensible**: Custom mapping logic per vendor without main codebase pollution
- **Per-Organization Configuration**: Each org can use different EHR vendor
- **Graceful Degradation**: If one vendor's API changes, only that vendor's client needs updating

### Negative
- **Boilerplate**: Each vendor needs a separate implementation class
- **Duplicate Logic**: Common FHIR parsing logic may be repeated across implementations
- **Testing Burden**: Need vendor-specific test data and mocks for each implementation
- **API Drift**: When vendors update FHIR R4 implementations, clients break (requires version pinning)

### Risks
- **Incomplete FHIR Implementation**: FHIR spec is large; vendors implement subsets
- **Vendor API Deprecation**: Vendors sunset old API versions; requires reactive updates
- **Real-Time Sync**: FHIR doesn't guarantee data consistency across systems; eventual consistency model required
- **Performance**: Each integration call is over the network; requires caching strategy

## Alternatives Considered

1. **Single Vendor Approach** (Epic-only)
   - Simpler initially
   - Locks customers into one EHR
   - Reduces addressable market
   - Epic's market share is declining (40% → 35% projected by 2027)

2. **HL7v2 Only** (Legacy Protocol)
   ```
   MSH|^~\&|ATTENDING|CLINIC01|EPIC|HC|20260224||ADT^A01||
   ```
   - Older, legacy standard; vendors moving to FHIR
   - Harder to parse; less structured
   - No longer recommended by HL7 organization

3. **Custom Integration Per Vendor** (Bespoke Code)
   - Each vendor integrates directly in handlers
   - No abstraction
   - 100+ lines duplicated per vendor
   - Impossible to maintain

## Implementation Notes

- Use `Hl7.Fhir.R4` NuGet package for FHIR model classes
- Implement **retry policies** with exponential backoff for API calls (Polly)
- Cache EHR configuration for 1 hour to reduce database queries
- Log all FHIR API calls with correlation IDs for debugging
- Implement **circuit breaker** pattern: if vendor API is down, fail gracefully
- Test with real vendor sandbox accounts (Epic Interconnect, Cerner Millennium Sandbox)
- Plan for FHIR R4 → R5 migration when vendors support it
