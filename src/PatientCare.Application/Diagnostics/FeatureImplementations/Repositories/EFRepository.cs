using Azure.Core;
using Azure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PatientCare.Application.Diagnostics.FeatureImplementations.Repositories;

internal class PatientCareDiagnosticsCosmosDbContext(string accountEndpoint, string databaseName, string? accountKey = null) : DbContext()
{
    private static readonly TokenCredential _defaultCredential = new DefaultAzureCredential();

    private readonly string _accountEndpoint = accountEndpoint;
    private readonly string _databaseName = databaseName;
    private readonly string? _accountKey = accountKey;

    public DbSet<ClinicalSummary> ClinicalSummaries { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasShadowIds()
            .HasRootDiscriminatorInJsonId()
            .HasDefaultContainer("patient-care-container");
        modelBuilder.ApplyConfiguration(EntityTypeConfigurations.ClinicalSummaryConfiguration.Instance);
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if(!string.IsNullOrEmpty(_accountKey))
            optionsBuilder.UseCosmos(_accountEndpoint, _accountKey, _databaseName);
        else
            optionsBuilder.UseCosmos(_accountEndpoint, _defaultCredential, _databaseName);
    }

    private static class EntityTypeConfigurations
    {
        public class ClinicalSummaryConfiguration : IEntityTypeConfiguration<ClinicalSummary>
        {
            public static ClinicalSummaryConfiguration Instance { get; } = new ClinicalSummaryConfiguration();
            public void Configure(EntityTypeBuilder<ClinicalSummary> builder)
            {
                builder.Property(x => x.ClinicId).IsRequired().ToJsonProperty("clinicId");
                builder.Property(x => x.MedicalRecordNumber).IsRequired().ToJsonProperty("medicalRecordNumber");
                builder.OwnsOne(x => x.VitalSigns, vs =>
                {
                    vs.Property(v => v.BloodPressureSystolic).ToJsonProperty("bloodPressureSystolic");
                    vs.Property(v => v.BloodPressureDiastolic).ToJsonProperty("bloodPressureDiastolic");
                    vs.Property(v => v.HeartRate).ToJsonProperty("heartRate");
                    vs.Property(v => v.TemperatureFahrenheit).ToJsonProperty("temperatureFahrenheit");
                    vs.Property(v => v.OxygenSaturation).ToJsonProperty("oxygenSaturation");
                });
                builder.Property(x => x.ChiefComplaint).IsRequired().ToJsonProperty("chiefComplaint");

                builder.HasKey(x => x.ChiefComplaint);
                builder.UseETagConcurrency();
            }
        }
    }
}