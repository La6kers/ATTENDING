using FluentValidation;

namespace Attending.Domain.Triage;
public static class ValidationRules
{
    public static void SetSurveyRules<T>(this IRuleBuilder<T, Survey> ruleBuilder)
    {
        ruleBuilder.ChildRules(symptom =>
        {
            symptom.RuleFor(x => x.Symptoms).NotEmpty().WithMessage("At least one symptom is required.");
            symptom.RuleForEach(x => x.Symptoms).SetSymptomRules();
        });
    }

    public static void SetSymptomRules<T>(this IRuleBuilder<T, Symptom> ruleBuilder)
    {
        ruleBuilder.NotNull().WithMessage("Symptom cannot be null.");
        ruleBuilder.ChildRules(symptom =>
        {
            symptom.RuleFor(x => x.Description).NotEmpty().WithMessage("Symptom description cannot be empty.");
            symptom.RuleForEach(x => x.Details).NotEmpty().WithMessage("Symptom details cannot be empty.");
        });
    }

    public static void SetVitalsRules<T>(this IRuleBuilder<T, Vitals> ruleBuilder)
    {
        ruleBuilder.ChildRules(vitals =>
        {
            vitals.RuleFor(x => x.TemperatureFahrenheit).GreaterThanOrEqualTo(95).LessThanOrEqualTo(105).WithMessage("Temperature must be between 95°F and 105°F.");
            vitals.RuleFor(x => x.HeartRate).InclusiveBetween(40, 180).WithMessage("Heart rate must be between 40 and 180 bpm.");
            vitals.RuleFor(x => x.RespiratoryRate).InclusiveBetween(10, 30).WithMessage("Respiratory rate must be between 10 and 30 breaths per minute.");
            vitals.RuleFor(x => x.BloodPressureSystolic).InclusiveBetween(90, 180).WithMessage("Systolic blood pressure must be between 90 and 180 mmHg.");
            vitals.RuleFor(x => x.BloodPressureDiastolic).InclusiveBetween(60, 120).WithMessage("Diastolic blood pressure must be between 60 and 120 mmHg.");
            vitals.RuleFor(x => x.OxygenSaturation).InclusiveBetween(90, 100).WithMessage("Oxygen saturation must be between 90% and 100%.");

            // at least one vital sign must be provided
            vitals.RuleFor(x => x.TemperatureFahrenheit).NotNull()
                .When(x => x.HeartRate == null && x.RespiratoryRate == null && x.BloodPressureSystolic == null && x.BloodPressureDiastolic == null && x.OxygenSaturation == null)
                .WithMessage("At least one vital sign must be provided.");
        });
    }
}