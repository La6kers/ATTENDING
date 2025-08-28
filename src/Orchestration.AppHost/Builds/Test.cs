namespace Orchestration.AppHost.Builds;
internal static class Test
{
    public static IDistributedApplicationBuilder? Build(IDistributedApplicationBuilder? builder)
    {
        if(builder is null)
            return null;

        // (global)event bus
        var attendingEventBus = builder.AddAzureServiceBus("attending-event-bus")
            .RunAsExisting("resource", "resource-group")
            .PublishAsExisting("resource", "resource-group");

        // (global)repository
        // remarks: first run might take a while to initialize the database
        var attendingRepository2 = builder.AddAzureCosmosDB("attending-repository")
            .RunAsExisting("resource", "resource-group")
            .PublishAsExisting("resource", "resource-group");

        var attendingRepository = builder.AddAzureCosmosDB("attending-repository")
            .RunAsEmulator(emulator =>
            {
                emulator.WithContainerName("attending-repository");
                emulator.WithGatewayPort(5000);
                emulator.WithPartitionCount(2);
                emulator.WithImageTag("latest");
                emulator.WithLifetime(ContainerLifetime.Persistent);
                emulator.WithDataVolume("attending-repository-data");
            })
            .WithHttpsEndpoint(5098, 5000)
            .WithUrl("https://localhost:5000/_explorer/index.html", "CosmosDb Explorer")
            .WithUrl("https://localhost:5000/_explorer/emulator.pem", "SSL Certificate");

        var database = attendingRepository.AddCosmosDatabase("attending-database");
        var clinicalIntakeContainer = database.AddContainer("clinical-intake-container", "/id");
        var patientCareContainer = database.AddContainer("patient-care-container", "/id");

        // (clinical intake) api
        var azureOpenAIEndpoint = builder.Configuration["Azure:OpenAI:Endpoint"];
        var azureOpenAIKey = builder.Configuration["Azure:OpenAI:ApiKey"];
        var azureOpenAIDeploymentName = builder.Configuration["Azure:OpenAI:DeploymentName"];

        var clinicalIntakeApi = builder.AddProject<Projects.ClinicalIntake_API>("clinical-intake-api")
            .WaitFor(attendingEventBus)
            .WithEnvironment("EventBusConnectionString", Constants.ServiceBusEmulator.DefaultConnectionString)
            .WithEnvironment("Azure__OpenAI__Endpoint", azureOpenAIEndpoint)
            .WithEnvironment("Azure__OpenAI__ApiKey", azureOpenAIKey)
            .WithEnvironment("Azure__OpenAI__DeploymentName", azureOpenAIDeploymentName)
            .WithEndpoint(5002, 5276)
            .WithUrl("http://localhost:5002/swagger/index.html", "Swagger");


        // (clinical intake) web
        builder.AddProject<Projects.ClinicalIntake_UI_Web>("clinical-intake-web")
            .WaitFor(clinicalIntakeApi)
            .WithExternalHttpEndpoints()
            .WithEnvironment("ClinicalIntakeApiUrl", clinicalIntakeApi.GetEndpoint("http"))
            .WithEnvironment("CLINIC_ID", "9001")
            .WithEndpoint(5001, 5227);

        // (patient care) event bus adapter
        var patientCareEventBusAdapter = builder.AddProject<Projects.PatientCare_Infrastructure_EventBusAdapter>("patient-care-event-bus-adapter")
            .WaitFor(attendingEventBus)
            .WaitFor(attendingRepository)
            .WithReference(database)
            .WithReference(patientCareContainer)
            .WithEnvironment("EventBusConnectionString", Constants.ServiceBusEmulator.DefaultConnectionString)
            .WithEnvironment("Azure__CosmosDb__AccountEndpoint", attendingRepository.GetEndpoint("https"))
            .WithEnvironment("Azure__CosmosDb__AccountKey", Constants.CosmosDbEmulator.DefaultAccountKey);

        // (patient care) web
        builder.AddProject<Projects.PatientCare_UI_Web>("patient-care-web")
            .WaitFor(attendingEventBus)
            .WaitFor(attendingRepository)
            .WithReference(database)
            .WithReference(patientCareContainer)
            .WithExternalHttpEndpoints()
            .WithEnvironment("CLINIC_ID", "9001")
            .WithEnvironment("EventBusConnectionString", Constants.ServiceBusEmulator.DefaultConnectionString)
            .WithEnvironment("Azure__CosmosDb__AccountEndpoint", attendingRepository.GetEndpoint("https"))
            .WithEnvironment("Azure__CosmosDb__AccountKey", Constants.CosmosDbEmulator.DefaultAccountKey)
            .WithEndpoint(5003, 5021);

        return builder;
    }
}
