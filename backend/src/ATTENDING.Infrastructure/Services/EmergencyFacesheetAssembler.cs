using Microsoft.EntityFrameworkCore;
using ATTENDING.Application.Commands.EmergencyAccess;
using ATTENDING.Domain.Entities;
using ATTENDING.Infrastructure.Data;

namespace ATTENDING.Infrastructure.Services;

/// <summary>
/// Assembles a read-only emergency facesheet from live patient data.
/// Called only within a valid, unexpired EmergencyAccessLog session.
///
/// Uses EnableAdminContext() because emergency access is intentionally
/// cross-tenant — a first responder presents to a patient, not a tenant.
/// The handler validates session validity and patient consent before here.
///
/// Phase 2 additions: DNR status, blood type, weight/height, emergency
/// contacts, implanted devices — requires additional Patient fields.
/// </summary>
public class EmergencyFacesheetAssembler : IEmergencyFacesheetAssembler
{
    private readonly AttendingDbContext _context;

    public EmergencyFacesheetAssembler(AttendingDbContext context)
    {
        _context = context;
    }

    public async Task<EmergencyFacesheet> AssembleAsync(
        Guid patientId,
        EmergencyAccessProfile profile,
        CancellationToken ct)
    {
        // Bypass tenant filter — emergency access is cross-tenant by design.
        _context.EnableAdminContext();

        var patient = await _context.Patients
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == patientId, ct);

        if (patient == null)
            throw new InvalidOperationException(
                $"Patient {patientId} not found for emergency facesheet assembly");

        // ── Allergies ─────────────────────────────────────────────────────
        var allergies = profile.ShowAllergies
            ? await _context.Allergies
                .IgnoreQueryFilters()
                .Where(a => a.PatientId == patientId && !a.IsDeleted)
                .Select(a => new EmergencyAllergy(
                    a.Allergen,
                    a.Reaction ?? "Unknown",
                    a.Severity.ToString()))
                .ToListAsync(ct)
            : new List<EmergencyAllergy>();

        // ── Active medications ────────────────────────────────────────────
        var medications = profile.ShowMedications
            ? await _context.MedicationOrders
                .IgnoreQueryFilters()
                .Where(m => m.PatientId == patientId
                         && !m.IsDeleted
                         && m.Status == Domain.Enums.MedicationOrderStatus.Active)
                .Select(m => new EmergencyMedication(
                    m.MedicationName,
                    m.Dosage,
                    m.Frequency,
                    m.ClinicalIndication))
                .ToListAsync(ct)
            : new List<EmergencyMedication>();

        // ── Active diagnoses ──────────────────────────────────────────────
        var diagnoses = profile.ShowDiagnoses
            ? await _context.MedicalConditions
                .IgnoreQueryFilters()
                .Where(c => c.PatientId == patientId && !c.IsDeleted && c.IsActive)
                .Select(c => new EmergencyDiagnosis(
                    c.Code,
                    c.Name,
                    c.OnsetDate.HasValue ? c.OnsetDate.Value.ToString("yyyy-MM-dd") : null))
                .ToListAsync(ct)
            : new List<EmergencyDiagnosis>();

        return new EmergencyFacesheet(
            PatientName:           patient.FullName,
            DateOfBirth:           patient.DateOfBirth.ToString("yyyy-MM-dd"),
            Age:                   patient.Age,
            Sex:                   patient.Sex.ToString(),
            BloodType:             null,          // Phase 2: add to Patient entity
            Weight:                null,          // Phase 2: add to Patient entity
            Height:                null,          // Phase 2: add to Patient entity
            Language:              patient.PrimaryLanguage,
            Mrn:                   patient.MRN,
            HasDnr:                false,         // Phase 2: add to Patient entity
            DnrDocumentedDate:     null,          // Phase 2
            DnrPhysician:          null,          // Phase 2
            IsFullCode:            true,          // Phase 2: derive from HasDnr
            PowerOfAttorney:       null,          // Phase 2
            PoaPhone:              null,          // Phase 2
            HasLivingWill:         false,         // Phase 2
            IsOrganDonor:          false,         // Phase 2
            AdvanceDirectiveNotes: null,          // Phase 2
            Allergies:             allergies,
            ActiveMedications:     medications,
            ActiveDiagnoses:       diagnoses,
            EmergencyContacts:     new List<EmergencyContact>(),   // Phase 2
            ImplantedDevices:      new List<EmergencyImplant>(),   // Phase 2
            AssembledAt:           DateTime.UtcNow,
            DataSource:            "Live"
        );
    }
}
