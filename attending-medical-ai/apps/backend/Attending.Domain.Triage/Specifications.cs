using System.Linq.Expressions;

namespace Attending.Domain.Triage;
internal static class SpecificationsExpressions
{
    public static Expression<Func<Survey, bool>> HasSymptoms(Survey survey) => x => x.Symptoms != null && x.Symptoms.Any();
}

internal static class SpecificationFunctions
{
    public static Func<Survey, bool> HasSymptoms(Survey survey) => SpecificationsExpressions.HasSymptoms(survey).Compile();
}