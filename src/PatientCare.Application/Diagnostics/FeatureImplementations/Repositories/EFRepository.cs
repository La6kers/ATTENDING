using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PatientCare.Application.Diagnostics.FeatureImplementations.Repositories;

public class PatientCareDiagnosticsDbContext(DbContextOptions<PatientCareDiagnosticsDbContext> options) : DbContext(options)
{
    public DbSet<ClinicalSummary> ClinicalSummaries { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasShadowIds();
        modelBuilder.HasDefaultContainer("patient-care-container");
    }

    private static class EntityTypeConfigurations
    {
        public class ClinicalSummaryConfiguration : IEntityTypeConfiguration<ClinicalSummary>
        {
            public void Configure(EntityTypeBuilder<ClinicalSummary> builder)
            {
                builder.HasKey(x => x.ChiefComplaint);


                builder.UseETagConcurrency();
            }
        }
    }
}