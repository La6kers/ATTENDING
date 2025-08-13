internal class Program
{
    private static void Main(string[] args)
    {
        var builder = DistributedApplication.CreateBuilder(args);

        var clinicalIntakeEventbus = builder.AddAzureServiceBus("clinical-intake-eventbus")
            .RunAsEmulator(emulator =>
            {
                emulator.WithConfigurationFile("./Eventbus/AzureServicebusConfigs.json");
            });

        var azureOpenAIEndpoint = builder.Configuration["AzureOpenAIEndpoint"];
        var azureOpenAIKey = builder.Configuration["AzureOpenAIKey"];
        var azureOpenAIDeploymentName = builder.Configuration["AzureOpenAIDeploymentName"];

        var clinicalIntakeApi = builder.AddProject<Projects.ClinicalIntake_API>("clinical-intake-api")
            .WaitFor(clinicalIntakeEventbus)
            .WithReference(clinicalIntakeEventbus, "AzureServiceBusConnectionString")
            .WithEnvironment("AzureOpenAIEndpoint", azureOpenAIEndpoint)
            .WithEnvironment("AzureOpenAIKey", azureOpenAIKey)
            .WithEnvironment("AzureOpenAIDeploymentName", azureOpenAIDeploymentName);

        builder.AddProject<Projects.ClinicalIntake_UI_Web>("clinical-intake-web")
            .WaitFor(clinicalIntakeApi)
            .WithExternalHttpEndpoints()
            .WithEnvironment("ClinicalIntakeApiUrl", clinicalIntakeApi.GetEndpoint("http"))
            .WithEnvironment("CLINIC_ID", "9001");

        builder.AddProject<Projects.PatientCare_UI_Web>("patient-care-web")
            .WithExternalHttpEndpoints();

        builder.Build().Run();
    }
}