using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PatientCare.Application.Diagnostics.FeatureImplementations.Repositories;

internal class PatientCareDiagnosticsCosmosDbContext(DbContextOptions<PatientCareDiagnosticsCosmosDbContext> options) : DbContext(options)
{
    public DbSet<ClinicalSummary> ClinicalSummaries { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasDefaultContainer("patient-care-container")
            .HasShadowIds()
            .HasRootDiscriminatorInJsonId();
        modelBuilder.ApplyConfiguration(EntityTypeConfigurations.ClinicalSummaryConfiguration.Instance);
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

                builder.HasKey(x => new { x.ClinicId, x.MedicalRecordNumber });
                builder.HasPartitionKey("__id");
                builder.UseETagConcurrency();
            }
        }
    }
}