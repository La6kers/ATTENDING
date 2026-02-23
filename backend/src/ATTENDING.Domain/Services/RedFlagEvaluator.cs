using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Domain.Services;

/// <summary>
/// Interface for red flag evaluation
/// </summary>
public interface IRedFlagEvaluator
{
    RedFlagEvaluation Evaluate(string chiefComplaint, string? symptomDescription, int? painSeverity);
}

/// <summary>
/// Domain service for detecting clinical red flags in patient symptoms
/// Red flags are critical clinical findings that require immediate attention
/// </summary>
public class RedFlagEvaluator : IRedFlagEvaluator
{
    private static readonly List<RedFlagPattern> Patterns = new()
    {
        // Cardiovascular - Potential ACS/MI
        new("Cardiovascular",
            new[] { "chest pain", "crushing chest", "pressure in chest", "radiating to arm", 
                    "radiating to jaw", "squeezing chest", "elephant on chest", "chest tightness" },
            RedFlagSeverity.Critical,
            "Possible acute coronary syndrome - immediate ECG and cardiac workup needed"),
            
        // Respiratory - Acute distress
        new("Respiratory",
            new[] { "can't breathe", "difficulty breathing", "shortness of breath at rest", 
                    "cyanosis", "blue lips", "gasping", "choking", "stridor", "severe asthma",
                    "respiratory distress" },
            RedFlagSeverity.Critical,
            "Acute respiratory distress - immediate airway assessment required"),
            
        // Neurological - Stroke/CNS emergency
        new("Neurological",
            new[] { "sudden weakness", "facial droop", "slurred speech", "worst headache of my life",
                    "sudden vision loss", "sudden numbness", "can't move arm", "can't move leg",
                    "thunderclap headache", "loss of consciousness", "seizure", "paralysis" },
            RedFlagSeverity.Critical,
            "Possible stroke or neurological emergency - activate stroke protocol"),
            
        // Psychiatric - Immediate safety concern
        new("Psychiatric",
            new[] { "suicidal", "want to kill myself", "thoughts of self-harm", "plan to end my life",
                    "want to die", "better off dead", "suicide plan", "hurting myself" },
            RedFlagSeverity.Critical,
            "Psychiatric emergency - suicidal ideation requires immediate safety assessment"),
            
        // Trauma - Severe injury
        new("Trauma",
            new[] { "severe bleeding", "can't stop bleeding", "gunshot", "stab wound", 
                    "major accident", "head injury", "unconscious after fall", "severe trauma" },
            RedFlagSeverity.Critical,
            "Traumatic injury - trauma team activation may be required"),
            
        // Anaphylaxis - Allergic emergency
        new("Allergy",
            new[] { "throat swelling", "can't swallow", "tongue swelling", "hives all over",
                    "anaphylaxis", "allergic reaction", "throat closing", "can't breathe allergic" },
            RedFlagSeverity.Critical,
            "Possible anaphylactic reaction - immediate epinephrine may be needed"),
            
        // Infectious - Sepsis/Meningitis
        new("Infectious",
            new[] { "high fever with confusion", "stiff neck with fever", "petechial rash",
                    "fever and altered mental status", "sepsis", "severe infection", 
                    "fever and rash", "meningitis symptoms" },
            RedFlagSeverity.Emergent,
            "Possible sepsis or meningitis - urgent workup and antibiotics needed"),
            
        // Abdominal - Surgical emergency
        new("Abdominal",
            new[] { "severe abdominal pain", "rigid abdomen", "rebound tenderness",
                    "abdominal pain and vomiting blood", "peritonitis", "acute abdomen" },
            RedFlagSeverity.Emergent,
            "Possible surgical abdomen - surgical consultation recommended"),
            
        // GI Bleeding
        new("GI Bleeding",
            new[] { "vomiting blood", "hematemesis", "black tarry stool", "melena",
                    "bright red blood per rectum", "bloody stool", "coffee ground vomit" },
            RedFlagSeverity.Emergent,
            "GI hemorrhage - IV access, labs, and GI consultation needed"),
            
        // Toxicology
        new("Toxicology",
            new[] { "overdose", "took too many pills", "poisoning", "ingested chemicals",
                    "drug overdose", "accidental ingestion", "intentional overdose" },
            RedFlagSeverity.Critical,
            "Toxic ingestion - poison control and supportive care needed"),
            
        // Obstetric
        new("Obstetric",
            new[] { "pregnant and bleeding", "pregnancy bleeding", "severe cramping pregnant",
                    "water broke early", "decreased fetal movement", "ectopic symptoms" },
            RedFlagSeverity.Emergent,
            "Obstetric emergency - immediate OB evaluation required"),
            
        // Pediatric
        new("Pediatric",
            new[] { "infant not breathing", "baby limp", "child unresponsive", 
                    "infant fever", "baby won't wake up", "child not responding" },
            RedFlagSeverity.Critical,
            "Pediatric emergency - immediate pediatric assessment required"),
            
        // Vascular
        new("Vascular",
            new[] { "sudden leg pain and cold", "pulseless extremity", "aaa symptoms",
                    "tearing back pain", "aortic dissection", "limb ischemia" },
            RedFlagSeverity.Critical,
            "Possible vascular emergency - immediate vascular assessment needed"),
            
        // Metabolic
        new("Metabolic",
            new[] { "diabetic and confused", "very low blood sugar", "dka symptoms",
                    "fruity breath", "diabetic ketoacidosis", "hypoglycemic" },
            RedFlagSeverity.Emergent,
            "Metabolic emergency - glucose check and metabolic panel needed")
    };
    
    /// <summary>
    /// Evaluate patient symptoms for red flags
    /// </summary>
    public RedFlagEvaluation Evaluate(string chiefComplaint, string? symptomDescription, int? painSeverity)
    {
        var combinedText = $"{chiefComplaint} {symptomDescription}".ToLowerInvariant();
        var detectedFlags = new List<DetectedRedFlag>();
        
        foreach (var pattern in Patterns)
        {
            foreach (var keyword in pattern.Keywords)
            {
                if (combinedText.Contains(keyword))
                {
                    detectedFlags.Add(new DetectedRedFlag(
                        pattern.Category,
                        keyword,
                        pattern.Severity,
                        pattern.ClinicalReason));
                    break; // One match per category is sufficient
                }
            }
        }
        
        // Pain severity 10/10 is always a red flag
        if (painSeverity.HasValue && painSeverity >= 10)
        {
            detectedFlags.Add(new DetectedRedFlag(
                "Pain",
                "10/10 pain severity",
                RedFlagSeverity.Emergent,
                "Severe pain (10/10) requiring immediate evaluation"));
        }
        
        // Pain severity 9/10 with certain symptoms is also concerning
        if (painSeverity.HasValue && painSeverity >= 9)
        {
            // Check if combined with other concerning features
            if (combinedText.Contains("sudden") || combinedText.Contains("worst ever") ||
                combinedText.Contains("never had before"))
            {
                var existingPainFlag = detectedFlags.FirstOrDefault(f => f.Category == "Pain");
                if (existingPainFlag == null)
                {
                    detectedFlags.Add(new DetectedRedFlag(
                        "Pain",
                        "Severe acute pain",
                        RedFlagSeverity.Emergent,
                        "Severe acute pain with concerning features"));
                }
            }
        }
        
        var hasRedFlags = detectedFlags.Any();
        var isCritical = detectedFlags.Any(f => f.Severity == RedFlagSeverity.Critical);
        var reason = string.Join("; ", detectedFlags.Select(f => f.ClinicalReason).Distinct());
        
        return new RedFlagEvaluation(
            detectedFlags.AsReadOnly(),
            hasRedFlags,
            isCritical,
            reason);
    }
}

/// <summary>
/// Result of red flag evaluation
/// </summary>
public record RedFlagEvaluation(
    IReadOnlyList<DetectedRedFlag> RedFlags,
    bool HasRedFlags,
    bool IsEmergency,
    string Reason);

/// <summary>
/// A detected red flag from patient symptoms
/// </summary>
public record DetectedRedFlag(
    string Category,
    string MatchedKeyword,
    RedFlagSeverity Severity,
    string ClinicalReason);

/// <summary>
/// Internal record for red flag patterns
/// </summary>
internal record RedFlagPattern(
    string Category,
    string[] Keywords,
    RedFlagSeverity Severity,
    string ClinicalReason);
