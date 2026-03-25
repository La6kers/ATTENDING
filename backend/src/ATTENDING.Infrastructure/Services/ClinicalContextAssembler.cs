using ATTENDING.Application.DTOs;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.ClinicalGuidelines;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.ValueObjects;
using Microsoft.Extensions.Logging;

namespace ATTENDING.Infrastructure.Services;

/// <summary>
/// Assembles EnrichedClinicalContext from patient repository data.
/// 
/// This is the bridge between raw database entities and the typed clinical
/// objects that the intelligence pipeline operates on. It:
///   1. Pulls patient demographics, allergies, conditions
///   2. Pulls recent lab results and maps to LOINC-keyed LabPanel
///   3. Pulls active medications as typed ActiveMedication objects
///   4. Pulls encounter vitals and maps to typed VitalSigns
///   5. Pulls assessment OLDCARTS data if an assessment ID is provided
/// 
/// The assembled context is immutable after creation — all tiers
/// reason about the same data snapshot.
/// 
/// Performance: typically 3-5 DB queries. Results are cacheable for
/// the duration of a clinical decision (minutes, not hours).
/// </summary>
public class ClinicalContextAssembler : IClinicalContextAssembler
{
    private readonly IPatientRepository _patientRepo;
    private readonly ILabOrderRepository _labOrderRepo;
    private readonly IMedicationOrderRepository _medOrderRepo;
    private readonly IEncounterRepository _encounterRepo;
    private readonly IAssessmentRepository _assessmentRepo;
    private readonly ILogger<ClinicalContextAssembler> _logger;

    public ClinicalContextAssembler(
        IPatientRepository patientRepo,
        ILabOrderRepository labOrderRepo,
        IMedicationOrderRepository medOrderRepo,
        IEncounterRepository encounterRepo,
        IAssessmentRepository assessmentRepo,
        ILogger<ClinicalContextAssembler> logger)
    {
        _patientRepo = patientRepo;
        _labOrderRepo = labOrderRepo;
        _medOrderRepo = medOrderRepo;
        _encounterRepo = encounterRepo;
        _assessmentRepo = assessmentRepo;
        _logger = logger;
    }

    public async Task<EnrichedClinicalContext> AssembleAsync(
        Guid patientId,
        Guid? encounterId = null,
        Guid? assessmentId = null,
        CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Assembling clinical context for patient {PatientId}, encounter {EncounterId}",
            patientId, encounterId);

        // 1. Patient demographics, allergies, conditions
        var patient = await _patientRepo.GetWithFullHistoryAsync(patientId, ct);
        if (patient == null)
        {
            _logger.LogWarning("Patient {PatientId} not found during context assembly", patientId);
            return new EnrichedClinicalContext { PatientId = patientId };
        }

        var context = new EnrichedClinicalContext
        {
            PatientId = patientId,
            PatientAge = patient.Age,
            PatientSex = patient.Sex,
            PrimaryLanguage = patient.PrimaryLanguage,
            Allergies = patient.Allergies
                .Where(a => a.IsActive)
                .Select(a => a.Allergen)
                .ToList(),
            ActiveConditions = patient.Conditions
                .Where(c => !c.IsDeleted && c.IsActive)
                .Select(c => c.Name)
                .ToList(),
        };

        // 2. Recent lab results → LabPanel with LOINC mapping
        await PopulateLabPanelAsync(context, patientId, ct);

        // 3. Active medications → typed ActiveMedication list
        await PopulateActiveMedicationsAsync(context, patientId, ct);

        // 4. Encounter context (vitals, chief complaint)
        if (encounterId.HasValue)
        {
            await PopulateEncounterContextAsync(context, encounterId.Value, ct);
        }

        // 5. Assessment OLDCARTS data
        if (assessmentId.HasValue)
        {
            await PopulateAssessmentDataAsync(context, assessmentId.Value, ct);
        }

        context.AssembledAt = DateTime.UtcNow;

        _logger.LogInformation(
            "Clinical context assembled: {LabCount} labs, {MedCount} medications, " +
            "{AllergyCount} allergies, {ConditionCount} conditions, vitals: {HasVitals}",
            context.RecentLabs.Results.Count,
            context.CurrentMedications.Count,
            context.Allergies.Count,
            context.ActiveConditions.Count,
            context.Vitals != null);

        return context;
    }

    public GuidelineInput ToGuidelineInput(EnrichedClinicalContext context)
    {
        return new GuidelineInput
        {
            PatientAge = context.PatientAge,
            PatientSex = context.PatientSex.ToString(),
            ChiefComplaint = context.ChiefComplaint,
            HpiNarrative = context.HpiNarrative,
            OldcartsData = context.OldcartsData,
            PainSeverity = context.PainSeverity,
            Vitals = context.Vitals,
            RecentLabs = context.RecentLabs,
            ActiveConditions = context.ActiveConditions.ToList(),
            CurrentMedications = context.CurrentMedications
                .Select(m => m.GenericName)
                .ToList(),
            IsPregnant = context.IsPregnant,
            IsImmunocompromised = context.IsImmunocompromised,
            RecentTravel = context.RecentTravel,
        };
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private async Task PopulateLabPanelAsync(
        EnrichedClinicalContext context, Guid patientId, CancellationToken ct)
    {
        try
        {
            var labOrders = await _labOrderRepo.GetByPatientIdAsync(patientId, ct);

            // Get resulted orders from the last 90 days
            var cutoff = DateTime.UtcNow.AddDays(-90);
            var recentResults = labOrders
                .Where(o => o.Result != null && o.Result.ResultedAt >= cutoff)
                .Select(o => MapLabOrderToResult(o))
                .Where(r => r != null)
                .Select(r => r!)   // Narrow from RecentLabResult? to RecentLabResult
                .ToList();

            context.RecentLabs = new LabPanel
            {
                Results = recentResults
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to populate lab panel for patient {PatientId}", patientId);
            // Non-critical — continue with empty labs
        }
    }

    private async Task PopulateActiveMedicationsAsync(
        EnrichedClinicalContext context, Guid patientId, CancellationToken ct)
    {
        try
        {
            var activeMeds = await _medOrderRepo.GetActiveByPatientIdAsync(patientId, ct);

            context.CurrentMedications = activeMeds
                .Select(m => new ActiveMedication
                {
                    GenericName = m.GenericName,
                    BrandName = m.MedicationName != m.GenericName ? m.MedicationName : null,
                    Dosage = $"{m.Strength} {m.Dosage}",
                    Route = m.Route,
                    Frequency = m.Frequency,
                    StartedAt = m.OrderedAt,
                    IsHighAlert = m.HasBlackBoxWarning || m.IsControlledSubstance,
                })
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to populate medications for patient {PatientId}", patientId);
        }
    }

    private async Task PopulateEncounterContextAsync(
        EnrichedClinicalContext context, Guid encounterId, CancellationToken ct)
    {
        try
        {
            var encounter = await _encounterRepo.GetWithOrdersAsync(encounterId, ct);
            if (encounter == null) return;

            context.EncounterId = encounterId;
            context.ChiefComplaint = encounter.ChiefComplaint ?? string.Empty;

            // NOTE: Vitals are not yet stored on the Encounter entity.
            // When vitals capture is implemented (via encounter form or device integration),
            // map them here:
            //
            // context.Vitals = VitalSigns.Create(
            //     systolicBp: encounter.SystolicBp,
            //     diastolicBp: encounter.DiastolicBp,
            //     heartRate: encounter.HeartRate,
            //     respiratoryRate: encounter.RespiratoryRate,
            //     spO2: encounter.SpO2,
            //     temperatureCelsius: encounter.Temperature,
            //     weightKg: encounter.Weight,
            //     heightCm: encounter.Height,
            //     recordedAt: encounter.StartedAt
            // );

            // For now, populate weight/height from patient if available
            if (encounter.Patient != null)
            {
                context.WeightKg = context.Vitals?.WeightKg;
                context.HeightCm = context.Vitals?.HeightCm;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to populate encounter context for {EncounterId}", encounterId);
        }
    }

    private async Task PopulateAssessmentDataAsync(
        EnrichedClinicalContext context, Guid assessmentId, CancellationToken ct)
    {
        try
        {
            var assessment = await _assessmentRepo.GetWithSymptomsAsync(assessmentId, ct);
            if (assessment == null) return;

            // Map individual OLDCARTS HPI fields to the dictionary
            // The guidelines engine queries these: e.g. OldcartsData["location"] contains "leg"
            MapIfPresent(context.OldcartsData, "onset", assessment.HpiOnset);
            MapIfPresent(context.OldcartsData, "location", assessment.HpiLocation);
            MapIfPresent(context.OldcartsData, "duration", assessment.HpiDuration);
            MapIfPresent(context.OldcartsData, "character", assessment.HpiCharacter);
            MapIfPresent(context.OldcartsData, "aggravating", assessment.HpiAggravating);
            MapIfPresent(context.OldcartsData, "relieving", assessment.HpiRelieving);
            MapIfPresent(context.OldcartsData, "timing", assessment.HpiTiming);
            MapIfPresent(context.OldcartsData, "severity", assessment.HpiSeverity);
            MapIfPresent(context.OldcartsData, "context", assessment.HpiContext);
            MapIfPresent(context.OldcartsData, "associated_symptoms", assessment.HpiAssociatedSymptoms);

            // Also map any AssessmentResponse records (structured responses)
            if (assessment.Responses != null)
            {
                foreach (var response in assessment.Responses)
                {
                    var key = response.Phase.ToString().ToLowerInvariant();
                    if (!context.OldcartsData.ContainsKey(key))
                    {
                        context.OldcartsData[key] = response.Response;
                    }
                }
            }

            // Build HPI narrative from OLDCARTS fields
            context.HpiNarrative = BuildHpiNarrative(assessment);

            // Pain severity
            if (assessment.PainSeverity.HasValue)
                context.PainSeverity = assessment.PainSeverity;

            // Override chief complaint from assessment if encounter didn't have one
            if (string.IsNullOrWhiteSpace(context.ChiefComplaint) &&
                !string.IsNullOrWhiteSpace(assessment.ChiefComplaint))
            {
                context.ChiefComplaint = assessment.ChiefComplaint;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to populate assessment data for {AssessmentId}", assessmentId);
        }
    }

    private static void MapIfPresent(Dictionary<string, string> dict, string key, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
            dict[key] = value;
    }

    /// <summary>
    /// Build a natural-language HPI narrative from OLDCARTS fields.
    /// This gives the AI a coherent story rather than disjointed fields.
    /// </summary>
    private static string BuildHpiNarrative(PatientAssessment assessment)
    {
        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(assessment.HpiOnset))
            parts.Add($"Onset: {assessment.HpiOnset}.");
        if (!string.IsNullOrWhiteSpace(assessment.HpiLocation))
            parts.Add($"Location: {assessment.HpiLocation}.");
        if (!string.IsNullOrWhiteSpace(assessment.HpiDuration))
            parts.Add($"Duration: {assessment.HpiDuration}.");
        if (!string.IsNullOrWhiteSpace(assessment.HpiCharacter))
            parts.Add($"Character: {assessment.HpiCharacter}.");
        if (!string.IsNullOrWhiteSpace(assessment.HpiAggravating))
            parts.Add($"Aggravating factors: {assessment.HpiAggravating}.");
        if (!string.IsNullOrWhiteSpace(assessment.HpiRelieving))
            parts.Add($"Relieving factors: {assessment.HpiRelieving}.");
        if (!string.IsNullOrWhiteSpace(assessment.HpiTiming))
            parts.Add($"Timing: {assessment.HpiTiming}.");
        if (!string.IsNullOrWhiteSpace(assessment.HpiSeverity))
            parts.Add($"Severity: {assessment.HpiSeverity}.");
        if (assessment.PainSeverity.HasValue)
            parts.Add($"Pain: {assessment.PainSeverity}/10.");
        if (!string.IsNullOrWhiteSpace(assessment.HpiAssociatedSymptoms))
            parts.Add($"Associated symptoms: {assessment.HpiAssociatedSymptoms}.");

        return string.Join(" ", parts);
    }

    private static RecentLabResult? MapLabOrderToResult(LabOrder order)
    {
        if (order.Result == null) return null;

        // Try to parse the result value as decimal for quantitative comparison
        if (!decimal.TryParse(order.Result.Value, out var numericValue))
            return null; // Skip non-numeric results for the structured panel

        return new RecentLabResult
        {
            LoincCode = order.LoincCode,
            TestName = order.TestName,
            Value = numericValue,
            Unit = order.Result.Unit ?? string.Empty,
            ReferenceRangeLow = order.Result.ReferenceRangeLow,
            ReferenceRangeHigh = order.Result.ReferenceRangeHigh,
            ResultedAt = order.Result.ResultedAt,
            IsCritical = order.Result.IsCritical,
        };
    }
}
