using Microsoft.Extensions.DependencyInjection;
using PatientCare.Application.Diagnostics.FeatureImplementations.Repositories;
using PatientCare.Application.Diagnostics.Features;
using SharedKernel;

namespace PatientCare.Application.Diagnostics;
public static class DependencyInjection
{
    public static IServiceCollection AddPatientCareDiagnosticsDomain(this IServiceCollection services)
    {
        return services
            .AddAddClinicalSummaryFeature()
            .AddGetClinicalSummariesByClinicIdFeature();
    }

    public static IServiceCollection AddPatientCareDiagnosticsCosmosDbRepositoryImplementation(this IServiceCollection services, string accountEndpoint, string? accountKey = null)
    {
        // TODO: get database name from configuration
        return services
            .AddScoped<IReadWriteRepository<ClinicalSummary>>(provider =>
            {
                var databaseName = "attending-database";
                var dbContext = new PatientCareDiagnosticsCosmosDbContext(accountEndpoint, databaseName, accountKey);
                return new EFReadWriteRepository<ClinicalSummary, PatientCareDiagnosticsCosmosDbContext>(dbContext);
            });
    }
}
