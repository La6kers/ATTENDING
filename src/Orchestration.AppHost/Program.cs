internal class Program
{
    private static void Main(string[] args)
    {
        var builder = DistributedApplication.CreateBuilder(args);

        var clinicalIntakeApi = builder.AddProject<Projects.ClinicalIntake_API>("ClinicalIntake-API");

        builder.AddProject<Projects.ClinicalIntake_UI_Web>("ClinicalIntake-UI-Web")
            .WithReference(clinicalIntakeApi)
            .WaitFor(clinicalIntakeApi)
            .WithEnvironment("ClinicalIntakeApiUrl", clinicalIntakeApi.GetEndpoint("https"));

        builder.Build().Run();
    }
}