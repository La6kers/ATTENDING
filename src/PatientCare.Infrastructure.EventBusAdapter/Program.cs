using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.Hosting;
using Orchestration.ServiceDefaults;
using PatientCare.Application.Diagnostics;

internal class Program
{
    private static void Main(string[] args)
    {
        var builder = FunctionsApplication.CreateBuilder(args);

        builder.ConfigureFunctionsWebApplication();
        builder.AddServiceDefaults();

        // Application Insights isn't enabled by default. See https://aka.ms/AAt8mw4.
        //builder.Services
        //    .AddApplicationInsightsTelemetryWorkerService()
        //    .ConfigureFunctionsApplicationInsights();

        // add patient care domain
        builder.Services
            .AddPatientCareDiagnosticsDomain();

        // add patent care implementations
        var cosmosDbAccountEndpoint = builder.Configuration["Azure__CosmosDb__AccountEndpoint"];
        ArgumentNullException.ThrowIfNullOrEmpty(cosmosDbAccountEndpoint, nameof(cosmosDbAccountEndpoint));
        var cosmosDbAccountKey = builder.Configuration["Azure__CosmosDb__AccountKey"];
        builder.Services
            .AddPatientCareDiagnosticsCosmosDbRepositoryImplementation(cosmosDbAccountEndpoint, cosmosDbAccountKey);

        builder.Build().Run();
    }
}