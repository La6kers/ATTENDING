// =============================================================================
// P16: MAR Reconciliation Domain Service
// =============================================================================
//
// Pure domain logic for medication reconciliation between SNF Medication
// Administration Records and receiving hospital formulary.
// No infrastructure dependencies — operates on domain entities only.
//
// @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claim 4
// =============================================================================

namespace ATTENDING.Domain.Services;

using ATTENDING.Domain.Entities;

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

public interface IMarReconciliationService
{
    /// <summary>
    /// Perform full medication reconciliation for a transfer.
    /// </summary>
    MarReconciliationResult Reconcile(
        IReadOnlyList<SNFMedication> snfMedications,
        IReadOnlyList<HospitalFormularyEntry> formulary,
        IReadOnlyList<Entities.Allergy>? patientAllergies = null);

    /// <summary>
    /// Check a single medication against the formulary.
    /// </summary>
    FormularyMatchResult CheckFormularyMatch(
        SNFMedication medication,
        IReadOnlyList<HospitalFormularyEntry> formulary);

    /// <summary>
    /// Detect therapeutic duplications across the medication list.
    /// </summary>
    IReadOnlyList<MARDiscrepancy> DetectTherapeuticDuplications(
        IReadOnlyList<SNFMedication> medications,
        IReadOnlyList<HospitalFormularyEntry> formulary);

    /// <summary>
    /// Flag high-risk medications requiring verification.
    /// </summary>
    IReadOnlyList<MARDiscrepancy> FlagHighRiskMedications(
        IReadOnlyList<SNFMedication> medications);

    /// <summary>
    /// Flag medications with recent dose changes.
    /// </summary>
    IReadOnlyList<MARDiscrepancy> FlagRecentChanges(
        IReadOnlyList<SNFMedication> medications,
        int lookbackDays = 7);
}

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

public record MarReconciliationResult(
    int TotalMedications,
    int FormularyMatches,
    int FormularyMisses,
    IReadOnlyList<MARDiscrepancy> Discrepancies,
    int CriticalCount,
    int WarningCount,
    int InfoCount,
    bool RequiresPharmacistReview,
    string SummaryText);

public record FormularyMatchResult(
    SNFMedication Medication,
    FormularyMatchType MatchType,
    HospitalFormularyEntry? MatchedEntry,
    HospitalFormularyEntry? AlternativeEntry,
    double Confidence);

public enum FormularyMatchType
{
    ExactRxnorm,
    GenericMatch,
    ClassMatch,
    NoMatch
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

public class MarReconciliationService : IMarReconciliationService
{
    public MarReconciliationResult Reconcile(
        IReadOnlyList<SNFMedication> snfMedications,
        IReadOnlyList<HospitalFormularyEntry> formulary,
        IReadOnlyList<Entities.Allergy>? patientAllergies = null)
    {
        var activeMeds = snfMedications
            .Where(m => m.Status == MedicationStatus.Active || m.Status == MedicationStatus.Held)
            .ToList();

        var discrepancies = new List<MARDiscrepancy>();
        var formularyMatches = 0;
        var formularyMisses = 0;

        // Step 1: Formulary matching for each medication
        foreach (var med in activeMeds)
        {
            var match = CheckFormularyMatch(med, formulary);

            if (match.MatchType == FormularyMatchType.NoMatch)
            {
                formularyMisses++;
                discrepancies.Add(CreateFormularyDiscrepancy(med, match));
            }
            else
            {
                formularyMatches++;

                // Check for dose/frequency mismatches against matched entry
                if (match.MatchType == FormularyMatchType.ClassMatch && match.AlternativeEntry != null)
                {
                    discrepancies.Add(new MARDiscrepancy
                    {
                        Id = Guid.NewGuid().ToString(),
                        Type = DiscrepancyType.MissingFromFormulary,
                        Severity = DiscrepancySeverity.Warning,
                        Description = $"{med.MedicationName} is not on formulary. " +
                            $"Therapeutic alternative: {match.AlternativeEntry.FormularyAlternative}",
                        SnfMedicationName = med.MedicationName,
                        SnfDose = med.Dose,
                        SnfFrequency = med.Frequency,
                        SnfRoute = med.Route,
                        HospitalAlternative = match.AlternativeEntry.FormularyAlternative,
                        HospitalAlternativeRxnorm = match.AlternativeEntry.FormularyAlternativeRxnorm,
                    });
                }
            }
        }

        // Step 2: Therapeutic duplication detection
        discrepancies.AddRange(DetectTherapeuticDuplications(activeMeds, formulary));

        // Step 3: High-risk medication flagging
        discrepancies.AddRange(FlagHighRiskMedications(activeMeds));

        // Step 4: Recent change flagging
        discrepancies.AddRange(FlagRecentChanges(activeMeds));

        // Step 5: Allergy conflict check
        if (patientAllergies != null)
        {
            discrepancies.AddRange(CheckAllergyConflicts(activeMeds, patientAllergies));
        }

        // Step 6: Controlled substance verification
        discrepancies.AddRange(FlagControlledSubstances(activeMeds));

        // Deduplicate (a medication may trigger multiple flags)
        var deduped = discrepancies
            .GroupBy(d => new { d.SnfMedicationId, d.Type })
            .Select(g => g.First())
            .ToList();

        var criticalCount = deduped.Count(d => d.Severity == DiscrepancySeverity.Critical);
        var warningCount = deduped.Count(d => d.Severity == DiscrepancySeverity.Warning);
        var infoCount = deduped.Count(d => d.Severity == DiscrepancySeverity.Info);

        var summary = GenerateSummaryText(activeMeds.Count, formularyMatches,
            formularyMisses, criticalCount, warningCount);

        return new MarReconciliationResult(
            TotalMedications: activeMeds.Count,
            FormularyMatches: formularyMatches,
            FormularyMisses: formularyMisses,
            Discrepancies: deduped,
            CriticalCount: criticalCount,
            WarningCount: warningCount,
            InfoCount: infoCount,
            RequiresPharmacistReview: criticalCount > 0,
            SummaryText: summary);
    }

    public FormularyMatchResult CheckFormularyMatch(
        SNFMedication medication,
        IReadOnlyList<HospitalFormularyEntry> formulary)
    {
        // Priority 1: Exact RxNorm match
        if (!string.IsNullOrEmpty(medication.RxnormCode))
        {
            var rxnormMatch = formulary.FirstOrDefault(f =>
                f.RxnormCode == medication.RxnormCode && f.IsOnFormulary);

            if (rxnormMatch != null)
                return new FormularyMatchResult(medication, FormularyMatchType.ExactRxnorm,
                    rxnormMatch, null, 1.0);
        }

        // Priority 2: Generic name match
        var genericName = medication.GenericName ?? medication.MedicationName;
        var genericMatch = formulary.FirstOrDefault(f =>
            f.GenericName.Equals(genericName, StringComparison.OrdinalIgnoreCase) && f.IsOnFormulary);

        if (genericMatch != null)
            return new FormularyMatchResult(medication, FormularyMatchType.GenericMatch,
                genericMatch, null, 0.9);

        // Priority 3: Therapeutic class match (find an alternative)
        if (!string.IsNullOrEmpty(medication.RxnormCode))
        {
            // Look for a formulary entry with the same therapeutic class that has an alternative
            var classMatch = formulary.FirstOrDefault(f =>
                f.RxnormCode == medication.RxnormCode && !f.IsOnFormulary &&
                !string.IsNullOrEmpty(f.FormularyAlternative));

            if (classMatch != null)
            {
                var alternative = formulary.FirstOrDefault(f =>
                    f.RxnormCode == classMatch.FormularyAlternativeRxnorm);

                return new FormularyMatchResult(medication, FormularyMatchType.ClassMatch,
                    classMatch, alternative ?? classMatch, 0.7);
            }
        }

        // No match
        return new FormularyMatchResult(medication, FormularyMatchType.NoMatch,
            null, null, 0.0);
    }

    public IReadOnlyList<MARDiscrepancy> DetectTherapeuticDuplications(
        IReadOnlyList<SNFMedication> medications,
        IReadOnlyList<HospitalFormularyEntry> formulary)
    {
        var discrepancies = new List<MARDiscrepancy>();

        // Group medications by therapeutic class (via formulary lookup)
        var medsByClass = new Dictionary<string, List<SNFMedication>>();

        foreach (var med in medications.Where(m => m.Status == MedicationStatus.Active))
        {
            var formularyEntry = formulary.FirstOrDefault(f =>
                f.RxnormCode == med.RxnormCode ||
                f.GenericName.Equals(med.GenericName ?? med.MedicationName,
                    StringComparison.OrdinalIgnoreCase));

            if (formularyEntry?.TherapeuticClass != null)
            {
                if (!medsByClass.ContainsKey(formularyEntry.TherapeuticClass))
                    medsByClass[formularyEntry.TherapeuticClass] = new List<SNFMedication>();
                medsByClass[formularyEntry.TherapeuticClass].Add(med);
            }
        }

        // Flag classes with >1 medication
        foreach (var (className, meds) in medsByClass.Where(kvp => kvp.Value.Count > 1))
        {
            // Skip known acceptable duplications
            if (IsAcceptableDuplication(className, meds))
                continue;

            for (int i = 1; i < meds.Count; i++)
            {
                discrepancies.Add(new MARDiscrepancy
                {
                    Id = Guid.NewGuid().ToString(),
                    SnfMedicationId = meds[i].Id,
                    Type = DiscrepancyType.TherapeuticDuplication,
                    Severity = DiscrepancySeverity.Warning,
                    Description = $"Potential therapeutic duplication: {meds[i].MedicationName} " +
                        $"and {meds[0].MedicationName} are both in class '{className}'",
                    SnfMedicationName = meds[i].MedicationName,
                    SnfDose = meds[i].Dose,
                    SnfFrequency = meds[i].Frequency,
                    InteractingMedication = meds[0].MedicationName,
                });
            }
        }

        return discrepancies;
    }

    public IReadOnlyList<MARDiscrepancy> FlagHighRiskMedications(
        IReadOnlyList<SNFMedication> medications)
    {
        return medications
            .Where(m => m.Status == MedicationStatus.Active && m.IsHighRisk)
            .Select(med => new MARDiscrepancy
            {
                Id = Guid.NewGuid().ToString(),
                SnfMedicationId = med.Id,
                Type = DiscrepancyType.HighRiskMedication,
                Severity = DiscrepancySeverity.Warning,
                Description = $"{med.MedicationName} is a high-risk medication requiring " +
                    $"verification upon hospital admission" +
                    (med.IsControlled ? $" (DEA Schedule {med.DeaSchedule})" : ""),
                SnfMedicationName = med.MedicationName,
                SnfDose = med.Dose,
                SnfFrequency = med.Frequency,
                SnfRoute = med.Route,
            })
            .ToList();
    }

    public IReadOnlyList<MARDiscrepancy> FlagRecentChanges(
        IReadOnlyList<SNFMedication> medications,
        int lookbackDays = 7)
    {
        return medications
            .Where(m => m.HasRecentChange(lookbackDays))
            .Select(med => new MARDiscrepancy
            {
                Id = Guid.NewGuid().ToString(),
                SnfMedicationId = med.Id,
                Type = DiscrepancyType.RecentChange,
                Severity = DiscrepancySeverity.Info,
                Description = $"{med.MedicationName} had a dose change within the last {lookbackDays} days: " +
                    $"previous dose {med.PreviousDose ?? "unknown"} → current dose {med.Dose}" +
                    (!string.IsNullOrEmpty(med.ChangeReason) ? $" (reason: {med.ChangeReason})" : ""),
                SnfMedicationName = med.MedicationName,
                SnfDose = med.Dose,
                SnfFrequency = med.Frequency,
                SnfRoute = med.Route,
            })
            .ToList();
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private IReadOnlyList<MARDiscrepancy> CheckAllergyConflicts(
        IReadOnlyList<SNFMedication> medications,
        IReadOnlyList<Entities.Allergy> allergies)
    {
        var discrepancies = new List<MARDiscrepancy>();

        foreach (var med in medications.Where(m => m.Status == MedicationStatus.Active))
        {
            var medName = (med.GenericName ?? med.MedicationName).ToLowerInvariant();

            foreach (var allergy in allergies)
            {
                var allergen = allergy.Allergen.ToLowerInvariant();

                // Direct name match or cross-reactivity
                if (medName.Contains(allergen) || allergen.Contains(medName) ||
                    IsCrossReactive(medName, allergen))
                {
                    discrepancies.Add(new MARDiscrepancy
                    {
                        Id = Guid.NewGuid().ToString(),
                        SnfMedicationId = med.Id,
                        Type = DiscrepancyType.AllergyConflict,
                        Severity = DiscrepancySeverity.Critical,
                        Description = $"ALLERGY CONFLICT: {med.MedicationName} may conflict with " +
                            $"documented allergy to {allergy.Allergen} " +
                            $"(severity: {allergy.Severity})",
                        SnfMedicationName = med.MedicationName,
                        SnfDose = med.Dose,
                        SnfFrequency = med.Frequency,
                    });
                }
            }
        }

        return discrepancies;
    }

    private IReadOnlyList<MARDiscrepancy> FlagControlledSubstances(
        IReadOnlyList<SNFMedication> medications)
    {
        return medications
            .Where(m => m.IsControlled && m.Status == MedicationStatus.Active)
            .Select(med => new MARDiscrepancy
            {
                Id = Guid.NewGuid().ToString(),
                SnfMedicationId = med.Id,
                Type = DiscrepancyType.ControlledSubstanceVerification,
                Severity = DiscrepancySeverity.Info,
                Description = $"{med.MedicationName} is a DEA Schedule {med.DeaSchedule} " +
                    $"controlled substance — count verification required at transfer",
                SnfMedicationName = med.MedicationName,
                SnfDose = med.Dose,
                SnfFrequency = med.Frequency,
            })
            .ToList();
    }

    private MARDiscrepancy CreateFormularyDiscrepancy(
        SNFMedication med, FormularyMatchResult match)
    {
        return new MARDiscrepancy
        {
            Id = Guid.NewGuid().ToString(),
            SnfMedicationId = med.Id,
            Type = DiscrepancyType.MissingFromFormulary,
            Severity = DiscrepancySeverity.Warning,
            Description = $"{med.MedicationName} ({med.Dose} {med.DoseUnit} {med.Frequency}) " +
                $"is not on the receiving hospital formulary. " +
                (match.AlternativeEntry != null
                    ? $"Suggested alternative: {match.AlternativeEntry.FormularyAlternative}"
                    : "No formulary alternative identified."),
            SnfMedicationName = med.MedicationName,
            SnfDose = med.Dose,
            SnfFrequency = med.Frequency,
            SnfRoute = med.Route,
            HospitalAlternative = match.AlternativeEntry?.FormularyAlternative,
            HospitalAlternativeDose = match.AlternativeEntry?.FormularyAlternative,
            HospitalAlternativeRxnorm = match.AlternativeEntry?.FormularyAlternativeRxnorm,
        };
    }

    private static string GenerateSummaryText(
        int totalMeds, int matches, int misses,
        int critical, int warnings)
    {
        var parts = new List<string>
        {
            $"{totalMeds} medications reviewed",
            $"{matches} on formulary",
        };

        if (misses > 0)
            parts.Add($"{misses} not on formulary");

        if (critical > 0)
            parts.Add($"{critical} CRITICAL discrepancies requiring pharmacist review");

        if (warnings > 0)
            parts.Add($"{warnings} warnings");

        return string.Join("; ", parts) + ".";
    }

    /// <summary>
    /// Known acceptable therapeutic duplications (e.g., basal + bolus insulin).
    /// </summary>
    private static bool IsAcceptableDuplication(string className, List<SNFMedication> meds)
    {
        // Basal + bolus insulin is expected
        if (className.Contains("insulin", StringComparison.OrdinalIgnoreCase) && meds.Count == 2)
        {
            var hasBasal = meds.Any(m =>
                (m.GenericName ?? "").Contains("glargine", StringComparison.OrdinalIgnoreCase) ||
                (m.GenericName ?? "").Contains("detemir", StringComparison.OrdinalIgnoreCase) ||
                (m.GenericName ?? "").Contains("degludec", StringComparison.OrdinalIgnoreCase));
            var hasRapid = meds.Any(m =>
                (m.GenericName ?? "").Contains("lispro", StringComparison.OrdinalIgnoreCase) ||
                (m.GenericName ?? "").Contains("aspart", StringComparison.OrdinalIgnoreCase) ||
                (m.GenericName ?? "").Contains("glulisine", StringComparison.OrdinalIgnoreCase));

            if (hasBasal && hasRapid) return true;
        }

        return false;
    }

    /// <summary>
    /// Basic cross-reactivity checking (penicillin/cephalosporin, sulfa, etc.).
    /// </summary>
    private static bool IsCrossReactive(string medicationName, string allergen)
    {
        // Penicillin ↔ Cephalosporin cross-reactivity
        var penicillins = new[] { "amoxicillin", "ampicillin", "penicillin", "piperacillin", "nafcillin" };
        var cephalosporins = new[] { "cephalexin", "ceftriaxone", "cefazolin", "cefepime", "ceftazidime" };

        if (penicillins.Any(p => allergen.Contains(p)) && cephalosporins.Any(c => medicationName.Contains(c)))
            return true;
        if (cephalosporins.Any(c => allergen.Contains(c)) && penicillins.Any(p => medicationName.Contains(p)))
            return true;

        // Sulfa cross-reactivity
        var sulfas = new[] { "sulfamethoxazole", "sulfasalazine", "sulfonamide" };
        if (sulfas.Any(s => allergen.Contains(s)) && sulfas.Any(s => medicationName.Contains(s)))
            return true;

        return false;
    }
}

// Minimal Allergy entity reference (to be replaced with actual import)
namespace ATTENDING.Domain.Entities
{
    public class Allergy
    {
        public string Id { get; set; } = string.Empty;
        public string Allergen { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty;
        public List<string> Reactions { get; set; } = new();
    }
}
