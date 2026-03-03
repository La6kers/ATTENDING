using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Infrastructure.Data.Configurations;

public class OrganizationConfiguration : IEntityTypeConfiguration<Organization>
{
    public void Configure(EntityTypeBuilder<Organization> builder)
    {
        builder.ToTable("Organizations", "clinical");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Slug).IsRequired().HasMaxLength(200);
        builder.Property(x => x.NPI).HasMaxLength(10);
        builder.Property(x => x.TaxId).HasMaxLength(20);
        builder.Property(x => x.PrimaryContactName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.PrimaryContactEmail).IsRequired().HasMaxLength(200);
        builder.Property(x => x.PrimaryContactPhone).HasMaxLength(20);
        builder.Property(x => x.Address).HasMaxLength(500);
        builder.Property(x => x.City).HasMaxLength(100);
        builder.Property(x => x.State).HasMaxLength(50);
        builder.Property(x => x.ZipCode).HasMaxLength(10);
        builder.Property(x => x.TimeZone).HasMaxLength(50).HasDefaultValue("America/New_York");

        builder.Property(x => x.OnboardingStatus)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(x => x.DataMode)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(x => x.FeatureFlagsJson)
            .HasMaxLength(4000)
            .HasDefaultValue("{}");

        builder.Property(x => x.RowVersion).IsRowVersion();

        // Indexes
        builder.HasIndex(x => x.Slug)
            .IsUnique()
            .HasFilter("[IsDeleted] = 0")
            .HasDatabaseName("IX_Organizations_Slug");

        builder.HasIndex(x => x.OnboardingStatus)
            .HasDatabaseName("IX_Organizations_OnboardingStatus");

        // Soft-delete filter (no tenant filter — Organization IS the tenant)
        builder.HasQueryFilter(x => !x.IsDeleted);

        // Owned collection: EhrConnectors
        builder.HasMany(x => x.EhrConnectors)
            .WithOne()
            .HasForeignKey(x => x.OrganizationId)
            .OnDelete(DeleteBehavior.Cascade);

        // Ignore domain events collection
        builder.Ignore(x => x.DomainEvents);
    }
}

public class EhrConnectorConfigConfiguration : IEntityTypeConfiguration<EhrConnectorConfig>
{
    public void Configure(EntityTypeBuilder<EhrConnectorConfig> builder)
    {
        builder.ToTable("EhrConnectorConfigs", "clinical");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Label).IsRequired().HasMaxLength(100);

        builder.Property(x => x.Vendor)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(x => x.ClientId).IsRequired().HasMaxLength(200);

        // ClientSecret encrypted at rest — EF converter handles encrypt/decrypt.
        // For now, stored as-is; encryption converter added when Azure Key Vault
        // or DPAPI is configured.
        builder.Property(x => x.ClientSecret).HasMaxLength(500);

        builder.Property(x => x.FhirBaseUrl).HasMaxLength(500);
        builder.Property(x => x.EhrTenantId).HasMaxLength(200);
        builder.Property(x => x.RedirectUri).HasMaxLength(500);
        builder.Property(x => x.VerificationDetails).HasMaxLength(2000);
        builder.Property(x => x.LastError).HasMaxLength(2000);

        // Indexes
        builder.HasIndex(x => x.OrganizationId)
            .HasDatabaseName("IX_EhrConnectors_OrganizationId");

        builder.HasIndex(x => new { x.OrganizationId, x.Vendor })
            .HasDatabaseName("IX_EhrConnectors_OrgVendor");

        // Soft-delete filter
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
