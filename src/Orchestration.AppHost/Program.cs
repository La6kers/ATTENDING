internal class Program
{
    private static void Main(string[] args)
    {
        var builder = DistributedApplication.CreateBuilder(args);

        var clinicalIntakeApi = builder.AddProject<Projects.ClinicalIntake_API>("clinical-intake-api");

        builder.AddProject<Projects.ClinicalIntake_UI_Web>("clinical-intake-ui-web")
            .WithReference(clinicalIntakeApi)
            .WaitFor(clinicalIntakeApi)
            .WithEnvironment("ClinicalIntakeApiUrl", clinicalIntakeApi.GetEndpoint("https"));

        builder.Build().Run();
    }
}