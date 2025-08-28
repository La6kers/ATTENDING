namespace Orchestration.AppHost.Builds;
internal static class Test
{
    private const string GlobalResourceGroup = "rg-attending-beta01";

    public static IDistributedApplicationBuilder? Build(IDistributedApplicationBuilder? builder)
    {
        if(builder is null)
            return null;

        // (global)event bus
        var attendingEventBus = builder.AddAzureServiceBus("attending-event-bus")
            .RunAsExisting("sb-attending-beta01", GlobalResourceGroup)
            .PublishAsExisting("sb-attending-beta01", GlobalResourceGroup);

        // (global)repository
        // remarks: first run might take a while to initialize the database
        var attendingRepository = builder.AddAzureCosmosDB("attending-repository")
            .RunAsExisting("attenting-beta02-cosmosdb-account", GlobalResourceGroup)
            .PublishAsExisting("attenting-beta02-cosmosdb-account", GlobalResourceGroup);

        var attendingOpenAI = builder.AddAzureOpenAI("attending-openai")
            .RunAsExisting("attending-open-ai", GlobalResourceGroup)
            .PublishAsExisting("attending-open-ai", GlobalResourceGroup);

        var database = attendingRepository.AddCosmosDatabase("attending-database");
        var clinicalIntakeContainer = database.AddContainer("clinical-intake-container", "/id");
        var patientCareContainer = database.AddContainer("patient-care-container", "/id");

        //// (clinical intake) api
        //var azureOpenAIEndpoint = builder.Configuration["Azure:OpenAI:Endpoint"];
        //var azureOpenAIKey = builder.Configuration["Azure:OpenAI:ApiKey"];
        //var azureOpenAIDeploymentName = builder.Configuration["Azure:OpenAI:DeploymentName"];

        //var clinicalIntakeApi = builder.AddProject<Projects.ClinicalIntake_API>("clinical-intake-api")
        //    .WaitFor(attendingEventBus)
        //    .WithEnvironment("EventBusConnectionString", Constants.ServiceBusEmulator.DefaultConnectionString)
        //    .WithEnvironment("Azure__OpenAI__Endpoint", azureOpenAIEndpoint)
        //    .WithEnvironment("Azure__OpenAI__ApiKey", azureOpenAIKey)
        //    .WithEnvironment("Azure__OpenAI__DeploymentName", azureOpenAIDeploymentName)
        //    .WithEndpoint(5002, 5276)
        //    .WithUrl("http://localhost:5002/swagger/index.html", "Swagger");


        //// (clinical intake) web
        //builder.AddProject<Projects.ClinicalIntake_UI_Web>("clinical-intake-web")
        //    .WaitFor(clinicalIntakeApi)
        //    .WithExternalHttpEndpoints()
        //    .WithEnvironment("ClinicalIntakeApiUrl", clinicalIntakeApi.GetEndpoint("http"))
        //    .WithEnvironment("CLINIC_ID", "9001");

        //// (patient care) event bus adapter
        //var patientCareEventBusAdapter = builder.AddProject<Projects.PatientCare_Infrastructure_EventBusAdapter>("patient-care-event-bus-adapter")
        //    .WaitFor(attendingEventBus)
        //    .WaitFor(attendingRepository)
        //    .WithReference(database)
        //    .WithReference(patientCareContainer)
        //    .WithEnvironment("EventBusConnectionString", Constants.ServiceBusEmulator.DefaultConnectionString)
        //    .WithEnvironment("Azure__CosmosDb__AccountEndpoint", attendingRepository.GetEndpoint("https"))
        //    .WithEnvironment("Azure__CosmosDb__AccountKey", Constants.CosmosDbEmulator.DefaultAccountKey);

        //// (patient care) web
        //builder.AddProject<Projects.PatientCare_UI_Web>("patient-care-web")
        //    .WaitFor(attendingEventBus)
        //    .WaitFor(attendingRepository)
        //    .WithReference(database)
        //    .WithReference(patientCareContainer)
        //    .WithExternalHttpEndpoints()
        //    .WithEnvironment("CLINIC_ID", "9001")
        //    .WithEnvironment("EventBusConnectionString", Constants.ServiceBusEmulator.DefaultConnectionString)
        //    .WithEnvironment("Azure__CosmosDb__AccountEndpoint", attendingRepository.GetEndpoint("https"))
        //    .WithEnvironment("Azure__CosmosDb__AccountKey", Constants.CosmosDbEmulator.DefaultAccountKey)
        //    .WithEndpoint(5003, 5021);

        return builder;
    }
}
