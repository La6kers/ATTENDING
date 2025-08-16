internal class Program
{
    private static void Main(string[] args)
    {
        var builder = DistributedApplication.CreateBuilder(args);
        // global Attending
        var attendingEventbus = builder.AddAzureServiceBus("attending-eventbus")
            .RunAsEmulator(emulator =>
            {
                emulator.WithConfigurationFile("./Eventbus/AzureServicebusConfigs.json");
            });

        var attendingRepository = builder.AddAzureCosmosDB("attending-repository")
            .RunAsEmulator(emulator =>
            {
                emulator.WithGatewayPort(9000);
                emulator.WithPartitionCount(1);
            });

        var database = attendingRepository.AddCosmosDatabase("attending-database");
        var clinicalIntakeContainer = database.AddContainer("clinical-intake-container", "/id");
        var patientCareContainer = database.AddContainer("patient-care-container", "/id");

        var azureOpenAIEndpoint = builder.Configuration["AzureOpenAIEndpoint"];
        var azureOpenAIKey = builder.Configuration["AzureOpenAIKey"];
        var azureOpenAIDeploymentName = builder.Configuration["AzureOpenAIDeploymentName"];

        // clinical intake
        var clinicalIntakeApi = builder.AddProject<Projects.ClinicalIntake_API>("clinical-intake-api")
            .WaitFor(attendingEventbus)
            //.WaitFor(attendingRepository)
            .WithReference(attendingEventbus, "AzureServiceBusConnectionString")
            .WithEnvironment("AzureOpenAIEndpoint", azureOpenAIEndpoint)
            .WithEnvironment("AzureOpenAIKey", azureOpenAIKey)
            .WithEnvironment("AzureOpenAIDeploymentName", azureOpenAIDeploymentName);

        builder.AddProject<Projects.ClinicalIntake_UI_Web>("clinical-intake-web")
            .WaitFor(clinicalIntakeApi)
            .WithExternalHttpEndpoints()
            .WithEnvironment("ClinicalIntakeApiUrl", clinicalIntakeApi.GetEndpoint("http"))
            .WithEnvironment("CLINIC_ID", "9001");

        // patient care
        //var patientCareEventBusAdapter = builder.AddProject<Projects.PatientCare_Infrastructure_EventBusAdapter>("patient-care-")
        //builder.AddProject<Projects.PatientCare_UI_Web>("patient-care-web")
        //    .WithExternalHttpEndpoints();

        builder.Build().Run();
    }
}