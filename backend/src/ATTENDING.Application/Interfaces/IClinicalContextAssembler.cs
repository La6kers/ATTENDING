using ATTENDING.Application.DTOs;
using ATTENDING.Domain.ClinicalGuidelines;

namespace ATTENDING.Application.Interfaces;

/// <summary>
/// Assembles an EnrichedClinicalContext from patient records.
/// 
/// This is the single entry point for gathering all clinical data needed
/// by the intelligence pipeline. It pulls from:
///   - Patient repository (demographics, allergies, conditions)
///   - Lab order repository (recent results with LOINC codes)
///   - Medication order repository (active medications)
///   - Encounter repository (current vitals, chief complaint)
///   - Assessment repository (OLDCARTS data, HPI narrative)
/// 
/// The assembled context is then passed to:
///   - GuidelineEvaluator (Tier 0 — pure domain logic)
///   - ClinicalAiService (Tier 2 — cloud AI, when available)
/// 
/// Design: assembled ONCE per clinical decision point, reused by all tiers.
/// This prevents redundant database queries and ensures all tiers
/// reason about the same data snapshot.
/// </summary>
public interface IClinicalContextAssembler
{
    /// <summary>
    /// Assemble full clinical context for a patient, optionally scoped to an encounter.
    /// </summary>
    /// <param name="patientId">The patient to assemble context for</param>
    /// <param name="encounterId">Optional: scope to a specific encounter for vitals/chief complaint</param>
    /// <param name="assessmentId">Optional: include OLDCARTS data from a specific assessment</param>
    /// <param name="ct">Cancellation token</param>
    Task<EnrichedClinicalContext> AssembleAsync(
        Guid patientId,
        Guid? encounterId = null,
        Guid? assessmentId = null,
        CancellationToken ct = default);

    /// <summary>
    /// Convert an EnrichedClinicalContext to a GuidelineInput for the guidelines engine.
    /// Lives here rather than in the domain because it bridges Application and Domain types.
    /// </summary>
    GuidelineInput ToGuidelineInput(EnrichedClinicalContext context);
}

/// <summary>
/// Tiered clinical intelligence orchestrator.
/// 
/// Coordinates the three intelligence tiers:
///   Tier 0: Pure domain logic (guidelines, red flags, drug interactions)
///   Tier 1: Local server (cached data, on-premise AI — future)
///   Tier 2: Cloud AI (BioMistral, external APIs — when available)
/// 
/// Key principle: clinical functionality NEVER degrades due to
/// network outages or AI service unavailability.
/// </summary>
public interface ITieredClinicalIntelligence
{
    /// <summary>
    /// Run the full clinical intelligence pipeline for a patient encounter.
    /// Automatically determines which tiers are available and runs them.
    /// </summary>
    Task<ClinicalIntelligenceResult> EvaluateAsync(
        Guid patientId,
        Guid? encounterId = null,
        Guid? assessmentId = null,
        CancellationToken ct = default);
}

/// <summary>
/// Result of the tiered clinical intelligence pipeline.
/// Contains results from all tiers that were available.
/// </summary>
public class ClinicalIntelligenceResult
{
    /// <summary>The clinical context that was evaluated</summary>
    public required EnrichedClinicalContext Context { get; init; }

    /// <summary>Tier 0: Guideline evaluation results (always available)</summary>
    public IReadOnlyList<GuidelineResult> GuidelineResults { get; init; } = Array.Empty<GuidelineResult>();

    /// <summary>Tier 0: Red flag evaluation results (always available)</summary>
    public IReadOnlyList<string> RedFlags { get; init; } = Array.Empty<string>();

    /// <summary>Tier 0: Drug interaction warnings (always available)</summary>
    public IReadOnlyList<string> DrugInteractions { get; init; } = Array.Empty<string>();

    /// <summary>Tier 2: AI-generated differential diagnosis (when available)</summary>
    public object? AiDifferentialDiagnosis { get; init; }

    /// <summary>Tier 2: AI-generated recommendations (when available)</summary>
    public object? AiRecommendations { get; init; }

    /// <summary>Which tiers were successfully executed</summary>
    public required IReadOnlyList<IntelligenceTier> TiersExecuted { get; init; }

    /// <summary>When this evaluation was performed</summary>
    public DateTime EvaluatedAt { get; init; } = DateTime.UtcNow;

    /// <summary>Total wall-clock time for the evaluation</summary>
    public TimeSpan Duration { get; init; }
}

/// <summary>
/// Intelligence tiers — indicates what level of clinical intelligence is available.
/// </summary>
public enum IntelligenceTier
{
    /// <summary>
    /// Pure domain logic: guidelines engine, red flag detection, drug interactions.
    /// Zero network dependencies. Runs on any machine. Always available.
    /// </summary>
    Tier0_PureDomain = 0,

    /// <summary>
    /// Local server: hospital on-premises deployment with cached drug databases,
    /// local AI models, and full patient database access.
    /// Available when hospital network is up (even if internet is down).
    /// </summary>
    Tier1_LocalServer = 1,

    /// <summary>
    /// Cloud AI: external AI services (BioMistral, Claude, etc.).
    /// Called only when available and when guidelines alone are insufficient.
    /// Minimizes API calls for cost and latency.
    /// </summary>
    Tier2_CloudAi = 2
}
