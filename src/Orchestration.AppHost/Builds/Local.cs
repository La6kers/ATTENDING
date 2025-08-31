namespace Orchestration.AppHost.Builds;
internal static class Local
{
    public static IDistributedApplicationBuilder? Build(IDistributedApplicationBuilder? builder)
    {
        if(builder is null)
            return null;

        // (global)event bus
        var attendingEventBus = builder.AddAzureServiceBus("Attending-EventBus")
            .RunAsEmulator(emulator =>
            {
                emulator.WithContainerName("attending-eventbus");
                emulator.WithLifetime(ContainerLifetime.Persistent);
            });

        // (global)repository
        // remarks: first run might take a while to initialize the database
        var attendingRepository = builder.AddAzureCosmosDB("Attending-Repository")
            .RunAsEmulator(emulator =>
            {
                emulator.WithContainerName("attending-repository");
                emulator.WithPartitionCount(2);
                emulator.WithLifetime(ContainerLifetime.Persistent);
                emulator.WithDataVolume("attending-repository-data");
                emulator.WithGatewayPort(5099);
            })
            .WithHttpsEndpoint(5099, 5099)
            .WithUrl("https://localhost:5099/_explorer/index.html", "CosmosDb Explorer")
            .WithUrl("https://localhost:5099/_explorer/emulator.pem", "SSL Certificate");

        var database = attendingRepository.AddCosmosDatabase("Attending-Database");
        var clinicalIntakeContainer = database.AddContainer("ClinicalIntake-Database-Container", "/id");
        var patientCareContainer = database.AddContainer("PatientCare-Database-Container", "/id");

        // AI ChatBot
        var azureOpenAIEndpoint = builder.Configuration["Azure:OpenAI:Endpoint"];
        var azureOpenAIKey = builder.Configuration["Azure:OpenAI:ApiKey"];
        var azureOpenAIDeploymentName = builder.Configuration["Azure:OpenAI:DeploymentName"];

        // in preview and and currently unable to add deployments
        var clinicalAIChatBot_ResourceName = builder.Configuration["ClinicalIntake:AI:ChatBot:ResourceName"];
        var clinicalAIChatBot_ResourceGroupName = builder.Configuration["ClinicalIntake:AI:ChatBot:ResourceGroupName"];

        var clinicalIntakeAIChatBot = builder.AddAzureOpenAI("ClinicalIntake-AI-Chatbot");
        clinicalIntakeAIChatBot
            .RunAsExisting(clinicalAIChatBot_ResourceName, clinicalAIChatBot_ResourceGroupName)
            .PublishAsExisting(clinicalAIChatBot_ResourceName, clinicalAIChatBot_ResourceGroupName);

        //var clinicalIntakeLLMDeployment = clinicalIntakeAIChatBot.AddDeployment("attending-gpt-4o", "gpt-4o", "2024-11-20");

        // (clinical intake) api
        var clinicalIntakeApi = builder.AddProject<Projects.ClinicalIntake_API>("ClinicalIntake-API")
            .WaitFor(attendingEventBus)
            .WithReference(attendingEventBus)
            .WithReference(clinicalIntakeAIChatBot)
            .WithEnvironment("Azure__OpenAI__Endpoint", azureOpenAIEndpoint)
            .WithEnvironment("Azure__OpenAI__ApiKey", azureOpenAIKey)
            .WithEnvironment("Azure__OpenAI__DeploymentName", azureOpenAIDeploymentName)
            .WithEndpoint(5002, 5276)
            .WithUrl("http://localhost:5002/swagger/index.html", "Swagger");


        // (clinical intake) web
        builder.AddProject<Projects.ClinicalIntake_UI_Web>("ClinicalIntake-Web")
            .WaitFor(clinicalIntakeApi)
            .WithReference(clinicalIntakeApi)
            .WithEnvironment("ClinicalIntakeApiUrl", clinicalIntakeApi.GetEndpoint("http"))
            .WithEnvironment("CLINIC_ID", "9001")
            .WithEndpoint(5001, 5227);

        // (patient care) event bus adapter
        var patientCareEventBusAdapter = builder.AddProject<Projects.PatientCare_Infrastructure_EventBusAdapter>("PatientCare-Eventbus-Adapter")
            .WaitFor(attendingEventBus)
            .WaitFor(attendingRepository)
            .WithReference(database)
            .WithReference(patientCareContainer)
            .WithReference(attendingEventBus)
            .WithEnvironment("Azure__CosmosDb__AccountEndpoint", attendingRepository.GetEndpoint("https"))
            .WithEnvironment("Azure__CosmosDb__AccountKey", Constants.CosmosDbEmulator.DefaultAccountKey);

        // (patient care) web
        builder.AddProject<Projects.PatientCare_UI_Web>("PatientCare-Web")
            .WaitFor(attendingEventBus)
            .WaitFor(attendingRepository)
            .WithReference(database)
            .WithReference(patientCareContainer)
            .WithReference(attendingEventBus)
            .WithEnvironment("CLINIC_ID", "9001")
            .WithEnvironment("Azure__CosmosDb__AccountEndpoint", attendingRepository.GetEndpoint("https"))
            .WithEnvironment("Azure__CosmosDb__AccountKey", Constants.CosmosDbEmulator.DefaultAccountKey)
            .WithEndpoint(5003, 5021);

        return builder;
    }
}
