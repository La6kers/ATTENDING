namespace ATTENDING.Domain.Services;

/// <summary>
/// Interface for drug interaction checking
/// </summary>
public interface IDrugInteractionService
{
    DrugInteractionResult CheckInteractions(string newMedication, IEnumerable<string> currentMedications);
    DrugInteractionResult CheckAllergyConflicts(string medication, IEnumerable<string> allergies);
}

/// <summary>
/// Domain service for checking drug-drug and drug-allergy interactions
/// </summary>
public class DrugInteractionService : IDrugInteractionService
{
    // Known drug interactions - in production, this would come from a database or API
    private static readonly List<DrugInteraction> KnownInteractions = new()
    {
        // Anticoagulant interactions
        new("warfarin", "aspirin", InteractionSeverity.Major,
            "Increased bleeding risk. Monitor INR closely and watch for signs of bleeding."),
        new("warfarin", "ibuprofen", InteractionSeverity.Major,
            "NSAIDs increase bleeding risk with warfarin. Consider alternative pain management."),
        new("warfarin", "acetaminophen", InteractionSeverity.Moderate,
            "High doses of acetaminophen may increase INR. Limit to <2g/day if possible."),
        new("heparin", "aspirin", InteractionSeverity.Major,
            "Significantly increased bleeding risk. Avoid combination unless specifically indicated."),
        new("enoxaparin", "aspirin", InteractionSeverity.Major,
            "Increased bleeding risk with LMWH + antiplatelet therapy."),
            
        // Cardiac interactions
        new("digoxin", "amiodarone", InteractionSeverity.Major,
            "Amiodarone increases digoxin levels. Reduce digoxin dose by 50%."),
        new("metoprolol", "verapamil", InteractionSeverity.Major,
            "Risk of severe bradycardia and heart block. Avoid combination."),
        new("lisinopril", "potassium", InteractionSeverity.Major,
            "Risk of hyperkalemia. Monitor potassium levels closely."),
        new("lisinopril", "spironolactone", InteractionSeverity.Major,
            "Additive hyperkalemia risk. Monitor potassium frequently."),
            
        // Serotonin syndrome risk
        new("fluoxetine", "tramadol", InteractionSeverity.Major,
            "Risk of serotonin syndrome. Monitor for confusion, fever, tremor."),
        new("sertraline", "sumatriptan", InteractionSeverity.Moderate,
            "Potential serotonin syndrome risk. Use with caution."),
        new("fluoxetine", "linezolid", InteractionSeverity.Contraindicated,
            "Contraindicated - high risk of serotonin syndrome."),
            
        // QT prolongation
        new("azithromycin", "amiodarone", InteractionSeverity.Major,
            "Additive QT prolongation risk. Monitor ECG."),
        new("ciprofloxacin", "sotalol", InteractionSeverity.Major,
            "QT prolongation risk. Consider alternative antibiotic."),
        new("ondansetron", "haloperidol", InteractionSeverity.Moderate,
            "Both prolong QT interval. Use lowest effective doses."),
            
        // Nephrotoxicity
        new("ibuprofen", "lisinopril", InteractionSeverity.Moderate,
            "NSAIDs reduce ACE inhibitor efficacy and increase renal risk."),
        new("gentamicin", "vancomycin", InteractionSeverity.Major,
            "Additive nephrotoxicity. Monitor renal function daily."),
        new("ibuprofen", "methotrexate", InteractionSeverity.Major,
            "NSAIDs increase methotrexate toxicity. Avoid combination."),
            
        // Diabetes interactions
        new("metformin", "contrast dye", InteractionSeverity.Major,
            "Hold metformin before/after contrast. Risk of lactic acidosis."),
        new("glipizide", "fluconazole", InteractionSeverity.Major,
            "Fluconazole increases sulfonylurea effect. Risk of hypoglycemia."),
            
        // CNS depression
        new("oxycodone", "lorazepam", InteractionSeverity.Major,
            "Additive CNS/respiratory depression. FDA black box warning."),
        new("morphine", "alprazolam", InteractionSeverity.Major,
            "Opioid + benzodiazepine: significant overdose risk. Avoid if possible."),
        new("gabapentin", "hydrocodone", InteractionSeverity.Moderate,
            "Additive CNS depression. Use lowest effective doses."),
            
        // Statin interactions
        new("simvastatin", "amiodarone", InteractionSeverity.Major,
            "Limit simvastatin to 10mg daily with amiodarone. Myopathy risk."),
        new("atorvastatin", "clarithromycin", InteractionSeverity.Major,
            "Clarithromycin increases statin levels. Use azithromycin instead."),
    };
    
    // Drug-allergy cross-reactivity
    private static readonly Dictionary<string, string[]> CrossReactivity = new()
    {
        ["penicillin"] = new[] { "amoxicillin", "ampicillin", "piperacillin", "nafcillin", "oxacillin" },
        ["sulfa"] = new[] { "sulfamethoxazole", "sulfasalazine", "sulfadiazine", "trimethoprim-sulfamethoxazole" },
        ["cephalosporin"] = new[] { "cephalexin", "cefazolin", "ceftriaxone", "cefepime", "cefdinir" },
        ["nsaid"] = new[] { "ibuprofen", "naproxen", "ketorolac", "meloxicam", "celecoxib", "aspirin" },
        ["ace inhibitor"] = new[] { "lisinopril", "enalapril", "ramipril", "benazepril", "captopril" },
        ["statin"] = new[] { "atorvastatin", "simvastatin", "rosuvastatin", "pravastatin", "lovastatin" },
    };

    public DrugInteractionResult CheckInteractions(string newMedication, IEnumerable<string> currentMedications)
    {
        var interactions = new List<FoundInteraction>();
        var newMedLower = newMedication.ToLowerInvariant();
        
        foreach (var currentMed in currentMedications)
        {
            var currentMedLower = currentMed.ToLowerInvariant();
            
            // Check direct interactions
            var directInteraction = KnownInteractions.FirstOrDefault(i =>
                (i.Drug1.Equals(newMedLower, StringComparison.OrdinalIgnoreCase) &&
                 i.Drug2.Equals(currentMedLower, StringComparison.OrdinalIgnoreCase)) ||
                (i.Drug1.Equals(currentMedLower, StringComparison.OrdinalIgnoreCase) &&
                 i.Drug2.Equals(newMedLower, StringComparison.OrdinalIgnoreCase)));
            
            if (directInteraction != null)
            {
                interactions.Add(new FoundInteraction(
                    newMedication,
                    currentMed,
                    directInteraction.Severity,
                    directInteraction.Description,
                    "Drug-Drug Interaction"));
            }
            
            // Check class-based interactions (simplified)
            foreach (var interaction in KnownInteractions)
            {
                if (ContainsMedicationOrClass(newMedLower, interaction.Drug1) &&
                    ContainsMedicationOrClass(currentMedLower, interaction.Drug2))
                {
                    if (!interactions.Any(i => i.Drug1 == newMedication && i.Drug2 == currentMed))
                    {
                        interactions.Add(new FoundInteraction(
                            newMedication,
                            currentMed,
                            interaction.Severity,
                            interaction.Description,
                            "Drug Class Interaction"));
                    }
                }
            }
        }
        
        return new DrugInteractionResult(
            interactions,
            interactions.Any(),
            interactions.Any(i => i.Severity == InteractionSeverity.Contraindicated),
            interactions.Any(i => i.Severity == InteractionSeverity.Major));
    }

    public DrugInteractionResult CheckAllergyConflicts(string medication, IEnumerable<string> allergies)
    {
        var interactions = new List<FoundInteraction>();
        var medLower = medication.ToLowerInvariant();
        
        foreach (var allergy in allergies)
        {
            var allergyLower = allergy.ToLowerInvariant();
            
            // Direct match
            if (medLower.Contains(allergyLower) || allergyLower.Contains(medLower))
            {
                interactions.Add(new FoundInteraction(
                    medication,
                    allergy,
                    InteractionSeverity.Contraindicated,
                    $"Patient has documented allergy to {allergy}. Do not administer {medication}.",
                    "Direct Allergy"));
                continue;
            }
            
            // Cross-reactivity check
            foreach (var (allergenClass, relatedDrugs) in CrossReactivity)
            {
                var isAllergyInClass = allergenClass.Equals(allergyLower) || 
                                       relatedDrugs.Any(d => allergyLower.Contains(d));
                var isMedInClass = relatedDrugs.Any(d => medLower.Contains(d));
                
                if (isAllergyInClass && isMedInClass)
                {
                    interactions.Add(new FoundInteraction(
                        medication,
                        allergy,
                        InteractionSeverity.Major,
                        $"Potential cross-reactivity between {medication} and {allergy} ({allergenClass} class). " +
                        "Assess risk/benefit before prescribing.",
                        "Cross-Reactivity"));
                }
            }
        }
        
        return new DrugInteractionResult(
            interactions,
            interactions.Any(),
            interactions.Any(i => i.Severity == InteractionSeverity.Contraindicated),
            interactions.Any(i => i.Severity == InteractionSeverity.Major));
    }
    
    private static bool ContainsMedicationOrClass(string medication, string target)
    {
        if (medication.Contains(target, StringComparison.OrdinalIgnoreCase))
            return true;
            
        // Check drug classes
        foreach (var (className, drugs) in CrossReactivity)
        {
            if (target.Equals(className, StringComparison.OrdinalIgnoreCase))
            {
                if (drugs.Any(d => medication.Contains(d, StringComparison.OrdinalIgnoreCase)))
                    return true;
            }
        }
        
        return false;
    }
}

/// <summary>
/// Result of drug interaction check
/// </summary>
public record DrugInteractionResult(
    IReadOnlyList<FoundInteraction> Interactions,
    bool HasInteractions,
    bool HasContraindications,
    bool HasMajorInteractions);

/// <summary>
/// A found drug interaction
/// </summary>
public record FoundInteraction(
    string Drug1,
    string Drug2,
    InteractionSeverity Severity,
    string Description,
    string InteractionType);

/// <summary>
/// Severity of drug interaction
/// </summary>
public enum InteractionSeverity
{
    Minor = 1,
    Moderate = 2,
    Major = 3,
    Contraindicated = 4
}

/// <summary>
/// Internal record for drug interaction definitions
/// </summary>
internal record DrugInteraction(
    string Drug1,
    string Drug2,
    InteractionSeverity Severity,
    string Description);
