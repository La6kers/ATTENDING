namespace Orchestration.AppHost.Builds;
internal abstract class BaseBuild()
{
    protected IResourceBuilder<ContainerResource>? EventBus { get; private set; }
    protected IResourceBuilder<AzureCosmosDBResource>? Repository { get; private set; }


    public IDistributedApplicationBuilder? Build(IDistributedApplicationBuilder? builder)
    {
        if(builder is null)
            return null;

        // (global)event bus repository
        var eventBusRepository = builder.AddContainer("attending-event-bus-repository", "mcr.microsoft.com/mssql/server", "2022-latest")
            .WithContainerName("attending-event-bus-repository")
            .WithEnvironment("ACCEPT_EULA", "Y")
            .WithEnvironment("MSSQL_SA_PASSWORD", "P@ssword1!")
            .WithEndpoint(1433, 1433);

        // (global)event bus
        // seealso: https://hub.docker.com/r/microsoft/azure-messaging-servicebus-emulator
        EventBus = builder.AddContainer("attending-event-bus", "mcr.microsoft.com/azure-messaging/servicebus-emulator", "latest")
            .WithContainerName("attending-event-bus")
            .WaitFor(eventBusRepository)
            .WithEnvironment("ACCEPT_EULA", "Y")
            .WithEnvironment("SQL_SERVER", "attending-event-bus-repository")
            .WithEnvironment("MSSQL_SA_PASSWORD", "P@ssword1!")
            .WithBindMount(@"C:\Repos\LakersAttending\src\Orchestration.AppHost\EventBus\AzureServiceBusConfiguration.json", "/ServiceBus_Emulator/ConfigFiles/Config.json", true)
            .WithEndpoint(5672, 5672);

        // (global)repository
        // remarks: first run might take a while to initialize the database
        Repository = builder.AddAzureCosmosDB("attending-repository");

        var database = Repository.AddCosmosDatabase("attending-database");
        var clinicalIntakeContainer = database.AddContainer("clinical-intake-container", "/id");
        var patientCareContainer = database.AddContainer("patient-care-container", "/id");

        // (clinical intake) api
        var azureOpenAIEndpoint = builder.Configuration["Azure__OpenAI__Endpoint"];
        var azureOpenAIKey = builder.Configuration["Azure__OpenAI__Key"];
        var azureOpenAIDeploymentName = builder.Configuration["Azure__OpenAI__DeploymentName"];


        var clinicalIntakeApi = builder.AddProject<Projects.ClinicalIntake_API>("clinical-intake-api")
            .WaitFor(EventBus)
            .WithEnvironment("EventBusConnectionString", Constants.ServiceBusEmulator.DefaultConnectionString)
            .WithEnvironment("Azure__OpenAI__Endpoint", azureOpenAIEndpoint)
            .WithEnvironment("Azure__OpenAI__Key", azureOpenAIKey)
            .WithEnvironment("Azure__OpenAI__DeploymentName", azureOpenAIDeploymentName);

        // (clinical intake) web
        builder.AddProject<Projects.ClinicalIntake_UI_Web>("clinical-intake-web")
            .WaitFor(clinicalIntakeApi)
            .WithExternalHttpEndpoints()
            .WithEnvironment("ClinicalIntakeApiUrl", clinicalIntakeApi.GetEndpoint("http"))
            .WithEnvironment("CLINIC_ID", "9001");

        // (patient care) event bus adapter
        var patientCareEventBusAdapter = builder.AddProject<Projects.PatientCare_Infrastructure_EventBusAdapter>("patient-care-event-bus-adapter")
            .WithEnvironment("EventBusConnectionString", Constants.ServiceBusEmulator.DefaultConnectionString);

        // (patient care) web
        builder.AddProject<Projects.PatientCare_UI_Web>("patient-care-web")
            .WithExternalHttpEndpoints();

        var environment = builder.Environment.EnvironmentName;
        ArgumentNullException.ThrowIfNull(environment, nameof(environment));
        if(environment == "Development")
        {
            // (global)event bus repository
            //attendingRepository
            //    .RunAsEmulator(emulator =>
            //    {
            //        emulator.WithContainerName("attending-repository");
            //        emulator.WithGatewayPort(5000);
            //        emulator.WithPartitionCount(1);
            //        emulator.WithImageTag("latest");
            //        emulator.WithLifetime(ContainerLifetime.Persistent);
            //    });
        }

        return builder;
    }

    protected abstract void ConfigureServices(IDistributedApplicationBuilder builder);
}
