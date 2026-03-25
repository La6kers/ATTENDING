namespace ATTENDING.Domain.ValueObjects;

/// <summary>
/// Structured recent lab result with reference ranges and clinical flags.
/// Tier 0 — pure domain logic, no network required.
/// 
/// Instead of "RenalFunction: impaired" (string), the AI receives:
///   Creatinine: 2.4 mg/dL (ref 0.7-1.3) [H] → Moderate impairment
/// </summary>
public record RecentLabResult
{
    public string LoincCode { get; init; } = string.Empty;
    public string TestName { get; init; } = string.Empty;
    public decimal Value { get; init; }
    public string Unit { get; init; } = string.Empty;
    public decimal? ReferenceRangeLow { get; init; }
    public decimal? ReferenceRangeHigh { get; init; }
    public DateTime ResultedAt { get; init; }
    public bool IsCritical { get; init; }

    public bool IsAbnormal =>
        (ReferenceRangeLow.HasValue && Value < ReferenceRangeLow.Value) ||
        (ReferenceRangeHigh.HasValue && Value > ReferenceRangeHigh.Value);

    public string Flag
    {
        get
        {
            if (!ReferenceRangeLow.HasValue && !ReferenceRangeHigh.HasValue) return "?";
            if (ReferenceRangeHigh.HasValue && Value > ReferenceRangeHigh.Value) return "H";
            if (ReferenceRangeLow.HasValue && Value < ReferenceRangeLow.Value) return "L";
            return "N";
        }
    }

    public TimeSpan Age => DateTime.UtcNow - ResultedAt;

    public bool IsRecentForAcuteDecision(TimeSpan? threshold = null)
        => Age <= (threshold ?? TimeSpan.FromHours(72));

    public string ToStructuredString()
    {
        var flagStr = Flag != "N" ? $" [{Flag}]" : "";
        var critStr = IsCritical ? " CRITICAL" : "";
        var rangeStr = ReferenceRangeLow.HasValue || ReferenceRangeHigh.HasValue
            ? $" (ref: {ReferenceRangeLow?.ToString() ?? "?"}-{ReferenceRangeHigh?.ToString() ?? "?"})"
            : "";
        var ageStr = Age.TotalHours < 24 ? "today" : $"{Age.Days}d ago";
        return $"{TestName}: {Value} {Unit}{flagStr}{critStr}{rangeStr} ({ageStr})";
    }
}

/// <summary>
/// Collection of recent lab results with organ function assessments.
/// Maps LOINC codes to clinical concepts so the AI gets
/// "Creatinine: 2.4" not "LOINC 2160-0: 2.4".
/// </summary>
public record LabPanel
{
    public IReadOnlyList<RecentLabResult> Results { get; init; } = Array.Empty<RecentLabResult>();

    // ── Convenience accessors by LOINC code ───────────────────────────────

    public RecentLabResult? Creatinine => MostRecent("2160-0");
    public RecentLabResult? Bun => MostRecent("3094-0");
    public RecentLabResult? Gfr => MostRecent("48642-3");
    public RecentLabResult? Alt => MostRecent("1742-6");
    public RecentLabResult? Ast => MostRecent("1920-8");
    public RecentLabResult? Bilirubin => MostRecent("1975-2");
    public RecentLabResult? Inr => MostRecent("6301-6");
    public RecentLabResult? Hemoglobin => MostRecent("718-7");
    public RecentLabResult? Platelets => MostRecent("777-3");
    public RecentLabResult? Wbc => MostRecent("6690-2");
    public RecentLabResult? Potassium => MostRecent("2823-3");
    public RecentLabResult? Sodium => MostRecent("2951-2");
    public RecentLabResult? Glucose => MostRecent("2345-7");
    public RecentLabResult? TroponinI => MostRecent("10839-9");
    public RecentLabResult? TroponinT => MostRecent("6598-7");
    public RecentLabResult? DDimer => MostRecent("48065-7");
    public RecentLabResult? Lactate => MostRecent("2524-7");
    public RecentLabResult? Tsh => MostRecent("3016-3");
    public RecentLabResult? HbA1c => MostRecent("4548-4");

    // ── Organ function assessments (Tier 0 — pure logic) ──────────────────

    public OrganFunctionAssessment RenalFunction
    {
        get
        {
            var cr = Creatinine;
            var gfr = Gfr;
            if (cr == null && gfr == null)
                return new OrganFunctionAssessment("Unknown", "No recent renal labs");

            if (gfr != null)
                return gfr.Value switch
                {
                    >= 90 => new("Normal", $"eGFR {gfr.Value} mL/min"),
                    >= 60 => new("Mild impairment", $"eGFR {gfr.Value} mL/min (CKD 2)"),
                    >= 30 => new("Moderate impairment", $"eGFR {gfr.Value} mL/min (CKD 3) - dose-adjust renally cleared drugs"),
                    >= 15 => new("Severe impairment", $"eGFR {gfr.Value} mL/min (CKD 4) - avoid nephrotoxins"),
                    _ => new("Kidney failure", $"eGFR {gfr.Value} mL/min (CKD 5)")
                };

            return cr!.Value switch
            {
                <= 1.3m => new("Normal", $"Cr {cr.Value} mg/dL"),
                <= 2.0m => new("Mild impairment", $"Cr {cr.Value} mg/dL"),
                <= 4.0m => new("Moderate impairment", $"Cr {cr.Value} mg/dL - dose-adjust required"),
                _ => new("Severe impairment", $"Cr {cr.Value} mg/dL - avoid nephrotoxins")
            };
        }
    }

    public OrganFunctionAssessment HepaticFunction
    {
        get
        {
            var alt = Alt; var ast = Ast; var bili = Bilirubin; var inr = Inr;
            if (alt == null && ast == null && bili == null)
                return new("Unknown", "No recent hepatic labs");

            var details = new List<string>();
            bool isImpaired = false, isSevere = false;

            if (alt != null) { details.Add($"ALT {alt.Value}"); if (alt.Value > 120) isSevere = true; else if (alt.Value > 40) isImpaired = true; }
            if (ast != null) { details.Add($"AST {ast.Value}"); if (ast.Value > 120) isSevere = true; else if (ast.Value > 40) isImpaired = true; }
            if (bili != null) { details.Add($"Bili {bili.Value}"); if (bili.Value > 3.0m) isSevere = true; else if (bili.Value > 1.2m) isImpaired = true; }
            if (inr != null) { details.Add($"INR {inr.Value}"); if (inr.Value > 1.5m) isSevere = true; }

            var summary = string.Join(", ", details);
            if (isSevere) return new("Severe impairment", $"{summary} - avoid hepatotoxins, adjust hepatically metabolized drugs");
            if (isImpaired) return new("Mild-moderate impairment", $"{summary} - monitor, consider dose adjustment");
            return new("Normal", summary);
        }
    }

    public IReadOnlyList<RecentLabResult> AbnormalResults =>
        Results.Where(r => r.IsAbnormal || r.IsCritical)
               .OrderByDescending(r => r.IsCritical)
               .ToList();

    public string ToStructuredSummary()
    {
        if (Results.Count == 0) return "No recent labs available";
        return string.Join("\n", Results.OrderByDescending(r => r.IsCritical).ThenBy(r => r.TestName).Select(r => r.ToStructuredString()));
    }

    private RecentLabResult? MostRecent(string loincCode) =>
        Results.Where(r => r.LoincCode == loincCode).OrderByDescending(r => r.ResultedAt).FirstOrDefault();
}

public record OrganFunctionAssessment(string Status, string Detail);

/// <summary>
/// A patient's current medication with structured data for interaction checking.
/// </summary>
public record ActiveMedication
{
    public string? RxNormCode { get; init; }
    public string GenericName { get; init; } = string.Empty;
    public string? BrandName { get; init; }
    public string? Dosage { get; init; }
    public string? Route { get; init; }
    public string? Frequency { get; init; }
    public DateTime? StartedAt { get; init; }
    public bool IsHighAlert { get; init; }

    public string ToDisplayString() =>
        $"{GenericName}{(Dosage != null ? $" {Dosage}" : "")}{(Route != null ? $" {Route}" : "")}{(Frequency != null ? $" {Frequency}" : "")}";
}
