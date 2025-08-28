using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Orchestration.ServiceDefaults;
using PatientCare.Application.Diagnostics;
using SharedKernel;

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

        // add application services
        builder.Services.AddScoped<Mediator>();
        builder.Services
            .Add_PatientCare_Diagnostics_Domain();

        // add patent care implementations
        builder.Add_PatientCare_Diagnostics_CosmosDbRepository_Implementation();

        builder.Build().Run();
    }
}