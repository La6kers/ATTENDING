using ATTENDING.Application.Commands.EmergencyAccess;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Infrastructure.Services;

/// <summary>
/// Assembles a read-only emergency facesheet from multiple data sources.
/// This service runs in an unauthenticated context (first responder access)
/// so it bypasses tenant filters by using the emergency access repository
/// which has explicit patient ID queries.
/// </summary>
public class EmergencyFacesheetAssembler : IEmergencyFacesheetAssembler
{
    private readonly IPatientRepository _patientRepository;
    private readonly IMedicationOrderRepository _medicationRepository;

    public EmergencyFacesheetAssembler(
        IPatientRepository patientRepository,
        IMedicationOrderRepository medicationRepository)
    {
        _patientRepository = patientRepository;
        _medicationRepository = medicationRepository;
    }

    public async Task<EmergencyFacesheet> AssembleAsync(
        Guid patientId,
        EmergencyAccessProfile profile,
        CancellationToken ct)
    {
        // Load patient with allergies and conditions
        var patient = await _patientRepository.GetWithFullHistoryAsync(patientId, ct);
        if (patient == null)
        {
            return new EmergencyFacesheet(
                PatientName: "Unknown Patient",
                DateOfBirth: "",
                Age: 0,
                Sex: "Unknown",
                BloodType: null,
                Weight: null,
                Height: null,
                Language: null,
                Mrn: "",
                HasDnr: false,
                DnrDocumentedDate: null,
                DnrPhysician: null,
                IsFullCode: true,
                PowerOfAttorney: null,
                PoaPhone: null,
                HasLivingWill: false,
                IsOrganDonor: false,
                AdvanceDirectiveNotes: null,
                Allergies: Array.Empty<EmergencyAllergy>(),
                ActiveMedications: Array.Empty<EmergencyMedication>(),
                ActiveDiagnoses: Array.Empty<EmergencyDiagnosis>(),
                EmergencyContacts: Array.Empty<EmergencyContact>(),
                ImplantedDevices: Array.Empty<EmergencyImplant>(),
                AssembledAt: DateTime.UtcNow,
                DataSource: "Partial");
        }

        // Assemble allergies (always critical — even if profile says hide, severe allergies show)
        var allergies = profile.ShowAllergies
            ? patient.Allergies
                .Where(a => a.IsActive)
                .Select(a => new EmergencyAllergy(
                    a.Allergen,
                    a.Reaction ?? "Unknown reaction",
                    a.Severity.ToString()))
                .ToList()
            : new List<EmergencyAllergy>();

        // Assemble active medications
        var medications = new List<EmergencyMedication>();
        if (profile.ShowMedications)
        {
            var activeMeds = await _medicationRepository.GetActiveByPatientIdAsync(patientId, ct);
            medications = activeMeds.Select(m => new EmergencyMedication(
                m.MedicationName,
                $"{m.Dosage} {m.Strength}",
                m.Frequency,
                m.ClinicalIndication)).ToList();
        }

        // Assemble active diagnoses
        var diagnoses = profile.ShowDiagnoses
            ? patient.Conditions
                .Where(c => c.IsActive)
                .Select(c => new EmergencyDiagnosis(
                    c.Code,
                    c.Name,
                    c.OnsetDate?.ToString("yyyy-MM-dd")))
                .ToList()
            : new List<EmergencyDiagnosis>();

        // Emergency contacts — placeholder: in production these would come from
        // a dedicated EmergencyContact entity. For now, use patient contact info.
        var contacts = new List<EmergencyContact>();
        if (profile.ShowEmergencyContacts && !string.IsNullOrWhiteSpace(patient.Phone))
        {
            contacts.Add(new EmergencyContact(
                "Primary Contact",
                "Self",
                patient.Phone,
                true));
        }

        // Implanted devices — placeholder: would come from a devices table
        var implants = new List<EmergencyImplant>();

        return new EmergencyFacesheet(
            PatientName: patient.FullName,
            DateOfBirth: patient.DateOfBirth.ToString("yyyy-MM-dd"),
            Age: patient.Age,
            Sex: patient.Sex.ToString(),
            BloodType: null, // Would come from lab results in production
            Weight: null,
            Height: null,
            Language: patient.PrimaryLanguage,
            Mrn: patient.MRN,
            // Advance directives — placeholder for pilot; real system queries directive records
            HasDnr: false,
            DnrDocumentedDate: null,
            DnrPhysician: null,
            IsFullCode: true,
            PowerOfAttorney: null,
            PoaPhone: null,
            HasLivingWill: false,
            IsOrganDonor: false,
            AdvanceDirectiveNotes: null,
            Allergies: allergies,
            ActiveMedications: medications,
            ActiveDiagnoses: diagnoses,
            EmergencyContacts: contacts,
            ImplantedDevices: implants,
            AssembledAt: DateTime.UtcNow,
            DataSource: "Live");
    }
}
