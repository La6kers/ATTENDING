using ATTENDING.Domain.ClinicalGuidelines;

namespace ATTENDING.Application.Services;

/// <summary>
/// OLAP-style guideline pruner: slices the registered guideline set to only
/// those relevant for a patient's chief complaint BEFORE running evaluation.
///
/// Pattern: "slice before compute" — instead of calling IsApplicable() on all
/// 200+ guidelines, the router narrows the candidate pool to 3–8 based on
/// chief complaint keywords, then GuidelineEvaluator evaluates only those.
///
/// Result: faster evaluation, tighter AI context window, and more accurate
/// differentials because unrelated guidelines don't add noise.
///
/// Offline-safe: runs in pure in-memory logic with zero network dependencies.
/// A rural clinic with no connectivity still gets fast, relevant guidelines.
/// </summary>
public class SymptomGuidelineRouter
{
    // ── Route table ──────────────────────────────────────────────────────────
    // Maps chief-complaint keyword clusters → guideline name fragments.
    // Guidelines whose names contain ANY of the listed fragments are included.
    // Order matters only for readability; evaluation order is controlled by
    // GuidelineEvaluator (sorted by pre-test probability).
    private static readonly List<SymptomRoute> _routes = new()
    {
        new(
            Keywords: new[] { "chest", "palpitation", "cardiac", "heart", "syncope", "diaphoresis" },
            GuidelineFragments: new[] { "HEART", "Wells", "ACS", "Cardiac", "PE", "Pulmonary", "Chest" }
        ),
        new(
            Keywords: new[] { "dyspnea", "shortness of breath", "sob", "breath", "respiratory", "cough", "hypoxia" },
            GuidelineFragments: new[] { "Wells", "PE", "Pulmonary", "CURB", "Pneumonia", "Asthma", "Respiratory", "Chest" }
        ),
        new(
            Keywords: new[] { "headache", "head", "migraine", "visual", "photophobia", "stiff neck", "neck" },
            GuidelineFragments: new[] { "Ottawa", "Meningitis", "Stroke", "Headache", "Neurolog" }
        ),
        new(
            Keywords: new[] { "stroke", "weakness", "facial droop", "slurred", "sudden numbness", "vision loss" },
            GuidelineFragments: new[] { "Stroke", "NIHSS", "Neurolog", "TIA", "Thrombolysis" }
        ),
        new(
            Keywords: new[] { "abdominal", "abdomen", "belly", "nausea", "vomiting", "diarrhea", "epigastric", "appendix" },
            GuidelineFragments: new[] { "Appendicitis", "Alvarado", "Abdominal", "GI", "Pancreatitis", "Cholecystitis" }
        ),
        new(
            Keywords: new[] { "leg", "calf", "swelling", "dvt", "deep vein", "clot" },
            GuidelineFragments: new[] { "Wells", "DVT", "Venous", "PE", "Pulmonary" }
        ),
        new(
            Keywords: new[] { "fall", "trauma", "knee", "ankle", "wrist", "fracture", "injury" },
            GuidelineFragments: new[] { "Ottawa", "NEXUS", "Canadian C-Spine", "Fracture", "Trauma" }
        ),
        new(
            Keywords: new[] { "fever", "sepsis", "infection", "shaking", "chills", "temperature" },
            GuidelineFragments: new[] { "SIRS", "Sepsis", "qSOFA", "NEWS", "Infection", "Meningitis", "CURB" }
        ),
        new(
            Keywords: new[] { "glucose", "diabetes", "dka", "diabetic", "hyperglycemia", "hypoglycemia" },
            GuidelineFragments: new[] { "DKA", "Diabetes", "Glucose", "HHS" }
        ),
        new(
            Keywords: new[] { "bleeding", "blood", "hemorrhage", "bruising", "anticoagulant" },
            GuidelineFragments: new[] { "GI", "Hemorrhage", "Coagulation", "Bleed", "Reversal" }
        ),
    };

    // ── Public API ────────────────────────────────────────────────────────────

    /// <summary>
    /// Filters the provided guideline collection to those relevant for the
    /// chief complaint. Returns ALL guidelines if the complaint is unrecognized
    /// (safe fallback — never silently drops relevant guidelines).
    /// </summary>
    public IEnumerable<IClinicalGuideline> RouteGuidelines(
        string chiefComplaint,
        IEnumerable<IClinicalGuideline> allGuidelines)
    {
        if (string.IsNullOrWhiteSpace(chiefComplaint))
            return allGuidelines;

        var complaint = chiefComplaint.ToLowerInvariant();
        var matchedFragments = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var route in _routes)
        {
            if (route.Keywords.Any(k => complaint.Contains(k, StringComparison.OrdinalIgnoreCase)))
            {
                foreach (var fragment in route.GuidelineFragments)
                    matchedFragments.Add(fragment);
            }
        }

        // No match → return all (safe fallback; unrecognized complaints get full coverage)
        if (matchedFragments.Count == 0)
            return allGuidelines;

        var routed = allGuidelines
            .Where(g => matchedFragments.Any(f =>
                g.GuidelineName.Contains(f, StringComparison.OrdinalIgnoreCase)))
            .ToList();

        // Safety: if routing prunes to zero, fall back to all (e.g. novel guideline names)
        return routed.Count > 0 ? routed : allGuidelines;
    }

    /// <summary>
    /// Returns the guideline name fragments that would be activated for a
    /// given complaint (for diagnostics/admin UI and unit testing).
    /// </summary>
    public IReadOnlyList<string> GetActiveFragments(string chiefComplaint)
    {
        if (string.IsNullOrWhiteSpace(chiefComplaint)) return Array.Empty<string>();
        var complaint = chiefComplaint.ToLowerInvariant();
        var fragments = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var route in _routes)
        {
            if (route.Keywords.Any(k => complaint.Contains(k, StringComparison.OrdinalIgnoreCase)))
                foreach (var f in route.GuidelineFragments)
                    fragments.Add(f);
        }
        return fragments.ToList();
    }

    // ── Private types ─────────────────────────────────────────────────────────

    private sealed record SymptomRoute(
        string[] Keywords,
        string[] GuidelineFragments);
}
