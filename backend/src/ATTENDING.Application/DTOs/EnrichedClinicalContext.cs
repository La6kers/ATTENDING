using ATTENDING.Domain.Enums;
using ATTENDING.Domain.ValueObjects;

namespace ATTENDING.Application.DTOs;

/// <summary>
/// Enriched clinical context that replaces the string-based ClinicalContext.
/// 
/// This is the single input object for the entire clinical intelligence pipeline:
///   EnrichedClinicalContext → Guidelines Engine (Tier 0)
///   EnrichedClinicalContext → Local AI Model (Tier 1 — hospital server)
///   EnrichedClinicalContext → Cloud AI (Tier 2 — BioMistral/external)
/// 
/// Every field is typed and quantitative. The AI gets numbers it can reason about,
/// not strings it has to parse. Guidelines get structured data they can score.
/// 
/// Key design decision: this object is assembled ONCE by ClinicalContextAssembler,
/// then passed to all tiers. This prevents redundant database queries and ensures
/// all tiers reason about the same data.
/// </summary>
public class EnrichedClinicalContext
{
    // ── Patient identity ──────────────────────────────────────────────────

    public Guid PatientId { get; set; }
    public int PatientAge { get; set; }
    public BiologicalSex PatientSex { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? HeightCm { get; set; }
    public string PrimaryLanguage { get; set; } = "English";

    // ── Current presentation ──────────────────────────────────────────────

    public Guid? EncounterId { get; set; }
    public string ChiefComplaint { get; set; } = string.Empty;
    public string HpiNarrative { get; set; } = string.Empty;

    /// <summary>
    /// OLDCARTS responses keyed by phase name.
    /// The guidelines engine uses these for pattern matching:
    ///   OldcartsData["location"] contains "leg" → Wells PE scores DVT criteria.
    /// </summary>
    public Dictionary<string, string> OldcartsData { get; set; } = new();

    public int? PainSeverity { get; set; }

    // ── Structured clinical data (Tier 0 operates on these directly) ──────

    /// <summary>Typed vitals with calculated metrics (MAP, Shock Index, SIRS)</summary>
    public VitalSigns? Vitals { get; set; }

    /// <summary>Recent lab results with organ function assessments</summary>
    public LabPanel RecentLabs { get; set; } = new();

    /// <summary>Active medications — used by drug interaction checker</summary>
    public IReadOnlyList<ActiveMedication> CurrentMedications { get; set; } = Array.Empty<ActiveMedication>();

    /// <summary>Active medical conditions (ICD-10 or plain text)</summary>
    public IReadOnlyList<string> ActiveConditions { get; set; } = Array.Empty<string>();

    /// <summary>Known allergies</summary>
    public IReadOnlyList<string> Allergies { get; set; } = Array.Empty<string>();

    /// <summary>Prior surgeries</summary>
    public IReadOnlyList<string> SurgicalHistory { get; set; } = Array.Empty<string>();

    // ── Context that changes differentials dramatically ────────────────────
    // A single boolean can shift probability by 30%+:
    //   pregnancy + abdominal pain → ectopic pregnancy moves to #1
    //   immunocompromised + fever → opportunistic infections dominate

    public bool? IsPregnant { get; set; }
    public string? RecentTravel { get; set; }
    public string? Occupation { get; set; }
    public bool? IsImmunocompromised { get; set; }
    public bool? IsSmoker { get; set; }
    public string? SubstanceUse { get; set; }

    // ── Quantitative organ function (from LabPanel, surfaced for convenience) ─

    /// <summary>Serum creatinine in mg/dL</summary>
    public decimal? CreatinineMgDl => RecentLabs.Creatinine?.Value;

    /// <summary>Baseline creatinine for AKI detection</summary>
    public decimal? BaselineCreatinine { get; set; }

    /// <summary>eGFR in mL/min</summary>
    public decimal? GfrMlMin => RecentLabs.Gfr?.Value;

    /// <summary>ALT in IU/L</summary>
    public decimal? AltIuL => RecentLabs.Alt?.Value;

    /// <summary>INR value</summary>
    public decimal? InrValue => RecentLabs.Inr?.Value;

    /// <summary>Troponin (I or T, whichever is available)</summary>
    public decimal? Troponin => RecentLabs.TroponinI?.Value ?? RecentLabs.TroponinT?.Value;

    /// <summary>D-Dimer value</summary>
    public decimal? DDimer => RecentLabs.DDimer?.Value;

    /// <summary>Lactate level</summary>
    public decimal? Lactate => RecentLabs.Lactate?.Value;

    // ── Intelligence tier tracking ────────────────────────────────────────
    // These track what intelligence tiers have already been applied,
    // so we don't redundantly re-query expensive tiers.

    /// <summary>When this context was assembled</summary>
    public DateTime AssembledAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Whether guideline evaluation has already been applied to this context.
    /// Prevents re-running guidelines when passing to AI tier.
    /// </summary>
    public bool GuidelinesEvaluated { get; set; }

    /// <summary>
    /// Whether red flag evaluation has already been applied.
    /// </summary>
    public bool RedFlagsEvaluated { get; set; }

    // ── Convenience methods ───────────────────────────────────────────────

    /// <summary>
    /// Generate a structured text summary for AI prompts.
    /// This replaces the old string concatenation in BuildDifferentialDiagnosisPrompt.
    /// The AI gets a clean, structured view of the entire clinical picture.
    /// </summary>
    public string ToAiPromptContext()
    {
        var sections = new List<string>();

        sections.Add($"PATIENT: {PatientAge}yo {PatientSex}, Language: {PrimaryLanguage}");
        sections.Add($"CHIEF COMPLAINT: {ChiefComplaint}");

        if (!string.IsNullOrWhiteSpace(HpiNarrative))
            sections.Add($"HPI: {HpiNarrative}");

        if (Vitals != null)
            sections.Add($"VITALS: {Vitals.ToStructuredSummary()}");

        if (RecentLabs.Results.Count > 0)
        {
            sections.Add($"RECENT LABS:\n{RecentLabs.ToStructuredSummary()}");
            sections.Add($"RENAL: {RecentLabs.RenalFunction.Detail}");
            sections.Add($"HEPATIC: {RecentLabs.HepaticFunction.Detail}");
        }

        if (CurrentMedications.Count > 0)
            sections.Add($"CURRENT MEDS: {string.Join(", ", CurrentMedications.Select(m => m.ToDisplayString()))}");

        if (Allergies.Count > 0)
            sections.Add($"ALLERGIES: {string.Join(", ", Allergies)}");

        if (ActiveConditions.Count > 0)
            sections.Add($"ACTIVE CONDITIONS: {string.Join(", ", ActiveConditions)}");

        // High-impact context
        var contextFlags = new List<string>();
        if (IsPregnant == true) contextFlags.Add("PREGNANT");
        if (IsImmunocompromised == true) contextFlags.Add("IMMUNOCOMPROMISED");
        if (!string.IsNullOrWhiteSpace(RecentTravel)) contextFlags.Add($"Travel: {RecentTravel}");
        if (!string.IsNullOrWhiteSpace(Occupation)) contextFlags.Add($"Occupation: {Occupation}");
        if (IsSmoker == true) contextFlags.Add("SMOKER");
        if (!string.IsNullOrWhiteSpace(SubstanceUse)) contextFlags.Add($"Substances: {SubstanceUse}");

        if (contextFlags.Count > 0)
            sections.Add($"CLINICAL CONTEXT: {string.Join(", ", contextFlags)}");

        return string.Join("\n", sections);
    }

    /// <summary>
    /// Get medication names as flat list for drug interaction checking.
    /// Bridges the typed ActiveMedication list to the existing
    /// DrugInteractionService which takes IEnumerable&lt;string&gt;.
    /// </summary>
    public IEnumerable<string> GetMedicationNamesForInteractionCheck() =>
        CurrentMedications.Select(m => m.GenericName);

    // NOTE: Legacy ClinicalContext mapping lives in Infrastructure layer
    // (ClinicalAiService) to maintain Clean Architecture boundaries.
    // Infrastructure reads from EnrichedClinicalContext; Application never
    // references Infrastructure types.
}
