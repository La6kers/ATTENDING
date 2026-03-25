using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Infrastructure.Data;

namespace ATTENDING.Infrastructure.Services;

/// <summary>
/// Seeds clinically realistic synthetic patients for Demo mode.
/// Idempotent: checks for DEMO- MRN prefix before inserting.
/// Patients cover: routine care, urgent presentations, pediatrics, geriatrics,
/// mental health, pregnancy, and complex multi-morbidity.
/// All data is HIPAA Safe Harbor de-identified (no real patient data).
/// </summary>
public class SyntheticDataSeeder : ISyntheticDataSeeder
{
    private readonly AttendingDbContext _context;
    private readonly ILogger<SyntheticDataSeeder> _logger;

    public SyntheticDataSeeder(AttendingDbContext context, ILogger<SyntheticDataSeeder> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<SeedResult> SeedAsync(
        Guid organizationId, bool includeDemoPatients,
        bool includeReferenceData, CancellationToken cancellationToken = default)
    {
        var patientCount = 0;
        var encounterCount = 0;
        var labOrderCount = 0;
        var referenceDataItems = 0;

        if (includeDemoPatients)
        {
            // Idempotency: check if demo patients already exist for this org
            var existingDemoCount = await _context.Patients
                .IgnoreQueryFilters()
                .CountAsync(p => p.OrganizationId == organizationId
                    && p.MRN.StartsWith("DEMO-"), cancellationToken);

            if (existingDemoCount > 0)
            {
                _logger.LogInformation(
                    "Demo patients already exist for org {OrgId} ({Count} found). Skipping seed.",
                    organizationId, existingDemoCount);
                return new SeedResult(0, 0, 0, 0);
            }

            var demoPatients = BuildDemoPatients(organizationId);
            foreach (var patient in demoPatients)
            {
                await _context.Patients.AddAsync(patient, cancellationToken);
                patientCount++;
            }

            // Create a demo provider user for encounter attribution
            var demoProvider = User.Create(
                "demo.provider@attending.local", "Demo", "Provider",
                UserRole.Provider, npi: "1234567890", specialty: "Family Medicine");
            demoProvider.SetOrganization(organizationId);
            await _context.Users.AddAsync(demoProvider, cancellationToken);

            // Create encounters for a subset of patients
            var patientsWithEncounters = demoPatients.Take(10).ToList();
            foreach (var patient in patientsWithEncounters)
            {
                var encounter = Encounter.Create(
                    patient.Id, demoProvider.Id, "Office Visit");
                encounter.SetOrganization(organizationId);
                encounter.Start(GetChiefComplaint(patient.MRN));
                await _context.Encounters.AddAsync(encounter, cancellationToken);
                encounterCount++;

                // Add lab orders for select patients
                if (ShouldHaveLabOrders(patient.MRN))
                {
                    var labOrder = CreateDemoLabOrder(patient, encounter, demoProvider, organizationId);
                    await _context.LabOrders.AddAsync(labOrder, cancellationToken);
                    labOrderCount++;
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Seeded demo data for org {OrgId}: {Patients} patients, {Encounters} encounters, {Labs} lab orders",
                organizationId, patientCount, encounterCount, labOrderCount);
        }

        return new SeedResult(patientCount, encounterCount, labOrderCount, referenceDataItems);
    }

    private static List<Patient> BuildDemoPatients(Guid organizationId)
    {
        return new List<Patient>
        {
            // Routine care
            Patient.Create(organizationId, "DEMO-001", "Margaret", "Chen", new DateTime(1958, 3, 15), BiologicalSex.Female),
            Patient.Create(organizationId, "DEMO-002", "Robert", "Williams", new DateTime(1965, 11, 22), BiologicalSex.Male),
            Patient.Create(organizationId, "DEMO-003", "Sarah", "Johnson", new DateTime(1982, 7, 4), BiologicalSex.Female),
            Patient.Create(organizationId, "DEMO-004", "James", "Martinez", new DateTime(1975, 1, 30), BiologicalSex.Male),
            Patient.Create(organizationId, "DEMO-005", "Patricia", "Thompson", new DateTime(1990, 9, 12), BiologicalSex.Female),

            // Urgent presentations
            Patient.Create(organizationId, "DEMO-006", "David", "Brown", new DateTime(1948, 6, 8), BiologicalSex.Male),
            Patient.Create(organizationId, "DEMO-007", "Linda", "Davis", new DateTime(1972, 12, 1), BiologicalSex.Female),
            Patient.Create(organizationId, "DEMO-008", "Michael", "Wilson", new DateTime(1960, 4, 25), BiologicalSex.Male),

            // Pediatrics
            Patient.Create(organizationId, "DEMO-009", "Emily", "Garcia", new DateTime(2018, 8, 14), BiologicalSex.Female),
            Patient.Create(organizationId, "DEMO-010", "Noah", "Anderson", new DateTime(2015, 2, 28), BiologicalSex.Male),
            Patient.Create(organizationId, "DEMO-011", "Sophia", "Taylor", new DateTime(2020, 5, 10), BiologicalSex.Female),

            // Geriatrics
            Patient.Create(organizationId, "DEMO-012", "Harold", "Nakamura", new DateTime(1938, 10, 3), BiologicalSex.Male),
            Patient.Create(organizationId, "DEMO-013", "Dorothy", "Richardson", new DateTime(1942, 7, 19), BiologicalSex.Female),

            // Mental health
            Patient.Create(organizationId, "DEMO-014", "Alex", "Rivera", new DateTime(1995, 3, 22), BiologicalSex.Male),
            Patient.Create(organizationId, "DEMO-015", "Jessica", "Lee", new DateTime(1988, 11, 5), BiologicalSex.Female),

            // Pregnancy
            Patient.Create(organizationId, "DEMO-016", "Maria", "Santos", new DateTime(1993, 6, 17), BiologicalSex.Female),
            Patient.Create(organizationId, "DEMO-017", "Ashley", "Moore", new DateTime(1997, 1, 9), BiologicalSex.Female),

            // Complex multi-morbidity
            Patient.Create(organizationId, "DEMO-018", "William", "Clark", new DateTime(1952, 8, 30), BiologicalSex.Male),
            Patient.Create(organizationId, "DEMO-019", "Barbara", "Lewis", new DateTime(1945, 4, 12), BiologicalSex.Female),
            Patient.Create(organizationId, "DEMO-020", "Richard", "Walker", new DateTime(1955, 12, 7), BiologicalSex.Male),

            // Rural-specific scenarios
            Patient.Create(organizationId, "DEMO-021", "Karen", "Hall", new DateTime(1970, 9, 25), BiologicalSex.Female),
            Patient.Create(organizationId, "DEMO-022", "Thomas", "Young", new DateTime(1985, 3, 8), BiologicalSex.Male),
            Patient.Create(organizationId, "DEMO-023", "Nancy", "King", new DateTime(1963, 7, 14), BiologicalSex.Female),

            // Edge cases: newborn and centenarian
            Patient.Create(organizationId, "DEMO-024", "Baby", "Newborn", DateTime.UtcNow.AddDays(-3), BiologicalSex.Male),
            Patient.Create(organizationId, "DEMO-025", "Ruth", "Elder", new DateTime(1930, 1, 1), BiologicalSex.Female),
        };
    }

    private static string? GetChiefComplaint(string mrn) => mrn switch
    {
        "DEMO-001" => "Follow-up for diabetes management — HbA1c due",
        "DEMO-002" => "Chest pain radiating to left arm, onset 2 hours ago",
        "DEMO-003" => "Annual wellness exam",
        "DEMO-004" => "Persistent cough for 3 weeks, low-grade fever",
        "DEMO-006" => "Severe headache, worst of life, sudden onset",
        "DEMO-007" => "Right lower quadrant pain, nausea, low-grade fever",
        "DEMO-009" => "Well-child check — 6 year old",
        "DEMO-012" => "Medication review — taking 12 medications, recent fall",
        "DEMO-014" => "Anxiety and insomnia worsening over 3 months",
        "DEMO-016" => "Prenatal visit — 28 weeks, routine glucose screening",
        _ => null
    };

    private static bool ShouldHaveLabOrders(string mrn) =>
        mrn is "DEMO-001" or "DEMO-002" or "DEMO-004" or "DEMO-006" or "DEMO-016";

    private static LabOrder CreateDemoLabOrder(
        Patient patient, Encounter encounter, User provider, Guid organizationId)
    {
        var (testCode, testName, loincCode, priority, indication) = patient.MRN switch
        {
            "DEMO-001" => ("4548-4", "Hemoglobin A1c", "4548-4", OrderPriority.Routine, "Diabetes management — HbA1c monitoring"),
            "DEMO-002" => ("6598-7", "Troponin I", "6598-7", OrderPriority.Stat, "Chest pain — rule out acute MI"),
            "DEMO-004" => ("718-7", "Hemoglobin", "718-7", OrderPriority.Routine, "Persistent cough workup — anemia screen"),
            "DEMO-006" => ("6299-2", "BUN", "6299-2", OrderPriority.Stat, "Severe headache — metabolic panel"),
            "DEMO-016" => ("2345-7", "Glucose", "2345-7", OrderPriority.Routine, "Prenatal glucose screening — 28 weeks"),
            _ => ("2951-2", "Sodium", "2951-2", OrderPriority.Routine, "Routine metabolic panel")
        };

        var lab = LabOrder.Create(
            patientId: patient.Id,
            encounterId: encounter.Id,
            orderingProviderId: provider.Id,
            testCode: testCode,
            testName: testName,
            cptCode: "80053",
            loincCode: loincCode,
            category: "Laboratory",
            priority: priority,
            clinicalIndication: indication,
            diagnosisCode: "Z00.00",
            requiresFasting: false);
        lab.SetOrganization(organizationId);
        return lab;
    }
}
