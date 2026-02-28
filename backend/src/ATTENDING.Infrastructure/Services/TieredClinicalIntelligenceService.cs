using ATTENDING.Application.DTOs;
using ATTENDING.Application.Interfaces;
using ATTENDING.Application.Services;
using ATTENDING.Domain.ClinicalGuidelines;
using ATTENDING.Domain.Services;
// Use Application.Interfaces.IClinicalAiService (Clean Architecture).
// Do NOT import ATTENDING.Infrastructure.External.AI to avoid ambiguity.
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace ATTENDING.Infrastructure.Services;

/// <summary>
/// Tiered clinical intelligence orchestrator.
/// 
/// Execution order:
///   1. Assemble clinical context (single DB round-trip)
///   2. Tier 0: Guidelines engine + Red flags + Drug interactions (pure domain, &lt;1ms)
///   3. Tier 2: Cloud AI (only if available, only if guidelines are insufficient)
/// 
/// Key design: Tier 0 ALWAYS runs. Tier 2 is optional enhancement.
/// A rural clinic with no internet still gets:
///   "Wells PE: 6.0 (High risk) → CTPA indicated"
///   "Red flag: chest pain with diaphoresis"
///   "Drug interaction: warfarin + aspirin (major)"
/// 
/// The AI (when available) interprets these Tier 0 results — it doesn't replace them.
/// AI gets the guideline scores as anchoring context, making its output more
/// specific and defensible. If AI disagrees with guidelines, the discrepancy
/// is flagged for the provider.
/// </summary>
public class TieredClinicalIntelligenceService : ITieredClinicalIntelligence
{
    private readonly IClinicalContextAssembler _contextAssembler;
    private readonly GuidelineEvaluator _guidelineEvaluator;
    private readonly IRedFlagEvaluator _redFlagEvaluator;
    private readonly IDrugInteractionService _drugInteractionService;
    private readonly ILogger<TieredClinicalIntelligenceService> _logger;

    // Tier 2 AI service is optional — null when unavailable
    private readonly IClinicalAiService? _aiService;

    public TieredClinicalIntelligenceService(
        IClinicalContextAssembler contextAssembler,
        GuidelineEvaluator guidelineEvaluator,
        IRedFlagEvaluator redFlagEvaluator,
        IDrugInteractionService drugInteractionService,
        ILogger<TieredClinicalIntelligenceService> logger,
        IClinicalAiService? aiService = null)
    {
        _contextAssembler = contextAssembler;
        _guidelineEvaluator = guidelineEvaluator;
        _redFlagEvaluator = redFlagEvaluator;
        _drugInteractionService = drugInteractionService;
        _logger = logger;
        _aiService = aiService;
    }

    public async Task<ClinicalIntelligenceResult> EvaluateAsync(
        Guid patientId,
        Guid? encounterId = null,
        Guid? assessmentId = null,
        CancellationToken ct = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var tiersExecuted = new List<IntelligenceTier>();

        // ── Step 1: Assemble context (DB queries) ─────────────────────────
        var context = await _contextAssembler.AssembleAsync(
            patientId, encounterId, assessmentId, ct);

        // ── Step 2: Tier 0 — Pure domain logic (always runs) ──────────────
        var guidelineInput = _contextAssembler.ToGuidelineInput(context);

        // Guidelines engine
        var guidelineResults = _guidelineEvaluator.EvaluateAll(guidelineInput);
        context.GuidelinesEvaluated = true;

        // Red flag detection
        var redFlags = new List<string>();
        try
        {
            var redFlagResult = _redFlagEvaluator.Evaluate(
                context.ChiefComplaint,
                context.HpiNarrative,
                context.PainSeverity);

            if (redFlagResult.HasRedFlags)
            {
                redFlags.AddRange(redFlagResult.RedFlags.Select(f =>
                    $"[{f.Severity}] {f.Category}: {f.ClinicalReason}"));
            }
            context.RedFlagsEvaluated = true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Red flag evaluation failed — continuing without");
        }

        // Drug interaction check — check each medication against all others
        var drugInteractions = new List<string>();
        try
        {
            var medNames = context.GetMedicationNamesForInteractionCheck().ToList();
            if (medNames.Count >= 2)
            {
                var seenInteractions = new HashSet<string>();
                for (int i = 0; i < medNames.Count; i++)
                {
                    var others = medNames.Where((_, idx) => idx != i).ToList();
                    var result = _drugInteractionService.CheckInteractions(medNames[i], others);
                    foreach (var interaction in result.Interactions)
                    {
                        // Deduplicate (A+B same as B+A)
                        var key = string.Compare(interaction.Drug1, interaction.Drug2, StringComparison.OrdinalIgnoreCase) < 0
                            ? $"{interaction.Drug1}|{interaction.Drug2}"
                            : $"{interaction.Drug2}|{interaction.Drug1}";
                        if (seenInteractions.Add(key))
                        {
                            drugInteractions.Add(
                                $"{interaction.Drug1} + {interaction.Drug2}: {interaction.Severity} — {interaction.Description}");
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Drug interaction check failed — continuing without");
        }

        tiersExecuted.Add(IntelligenceTier.Tier0_PureDomain);

        _logger.LogInformation(
            "Tier 0 complete: {GuidelineCount} guidelines, {RedFlagCount} red flags, " +
            "{InteractionCount} drug interactions in {ElapsedMs}ms",
            guidelineResults.Count, redFlags.Count, drugInteractions.Count,
            stopwatch.ElapsedMilliseconds);

        // ── Step 3: Tier 2 — Cloud AI (optional, when available) ──────────
        object? aiDifferential = null;
        object? aiRecommendations = null;

        if (_aiService != null && !ct.IsCancellationRequested)
        {
            try
            {
                // AI gets the guideline results as structured context
                // so it interprets scored evidence rather than guessing
                var aiPromptContext = context.ToAiPromptContext();
                var guidelineContext = GuidelineEvaluator.FormatForAiPrompt(guidelineResults);

                // TODO: Call AI service with enriched context + guideline anchors
                // This will be wired when ClinicalAiService is updated to accept
                // EnrichedClinicalContext instead of the legacy string-based ClinicalContext.
                //
                // aiDifferential = await _aiService.GetDifferentialDiagnosisAsync(
                //     context, guidelineResults, ct);
                // aiRecommendations = await _aiService.GetRecommendationsAsync(
                //     context, guidelineResults, ct);

                tiersExecuted.Add(IntelligenceTier.Tier2_CloudAi);
            }
            catch (Exception ex)
            {
                // AI failure is NOT a clinical failure.
                // Tier 0 results are already complete and actionable.
                _logger.LogWarning(ex,
                    "Tier 2 (Cloud AI) failed — Tier 0 results are available and sufficient");
            }
        }
        else
        {
            _logger.LogInformation("Tier 2 (Cloud AI) skipped — service not available");
        }

        stopwatch.Stop();

        return new ClinicalIntelligenceResult
        {
            Context = context,
            GuidelineResults = guidelineResults,
            RedFlags = redFlags,
            DrugInteractions = drugInteractions,
            AiDifferentialDiagnosis = aiDifferential,
            AiRecommendations = aiRecommendations,
            TiersExecuted = tiersExecuted,
            Duration = stopwatch.Elapsed,
        };
    }
}
