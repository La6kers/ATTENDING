using Azure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using PatientCare.Application.Diagnostics.FeatureImplementations.Repositories;
using PatientCare.Application.Diagnostics.Features;
using SharedKernel;

namespace PatientCare.Application.Diagnostics;
public static class DependencyInjection
{
    public static IServiceCollection Add_PatientCare_Diagnostics_Domain(this IServiceCollection services)
    {
        return services
            .AddAddClinicalSummaryFeature()
            .AddGetClinicalSummariesByClinicIdFeature();
    }

    public static IHostApplicationBuilder Add_PatientCare_Diagnostics_CosmosDbRepository_Implementation(this IHostApplicationBuilder builder)
    {
        // TODO: get database name from configuration
        var cosmosDatabaseName = "attending-database";
        var cosmosContainerName = "patient-care-container";

        var connectionString = builder.Configuration.GetConnectionString(cosmosContainerName);
        var accountEndpoint = builder.Configuration["Azure:CosmosDb:AccountEndpoint"];

        if(!string.IsNullOrEmpty(connectionString))
            builder.AddCosmosDbContext<PatientCareDiagnosticsCosmosDbContext>(cosmosContainerName, cosmosDatabaseName);
        else if(!string.IsNullOrEmpty(accountEndpoint))
        {
            builder.Services.AddSingleton(new DefaultAzureCredential());
            builder.Services.AddDbContext<PatientCareDiagnosticsCosmosDbContext>((provider, options) =>
            {
                var credential = provider.GetRequiredService<DefaultAzureCredential>();
                options.UseCosmos(accountEndpoint, credential, cosmosDatabaseName);
            });
        }

        builder.Services
            .AddScoped<IReadWriteRepository<ClinicalSummary>, EFReadWriteRepository<ClinicalSummary, PatientCareDiagnosticsCosmosDbContext>>();

        builder.Services
            .AddScoped<IReadRepository<ClinicalSummary>, EFReadRepository<ClinicalSummary, PatientCareDiagnosticsCosmosDbContext>>();

        return builder;
    }
}
