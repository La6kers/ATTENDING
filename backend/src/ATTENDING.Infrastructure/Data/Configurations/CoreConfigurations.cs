using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Infrastructure.Data.Configurations;

/// <summary>
/// User entity configuration
/// </summary>
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users", "identity");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Email)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(x => x.FirstName)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.LastName)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Role)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(x => x.NPI)
            .HasMaxLength(10);

        builder.Property(x => x.Specialty)
            .HasMaxLength(100);

        builder.Property(x => x.AzureAdObjectId)
            .HasMaxLength(50);

        // Indexes
        builder.HasIndex(x => x.Email)
            .IsUnique()
            .HasDatabaseName("IX_Users_Email");

        builder.HasIndex(x => x.NPI)
            .IsUnique()
            .HasFilter("[NPI] IS NOT NULL")
            .HasDatabaseName("IX_Users_NPI");

        builder.HasIndex(x => x.AzureAdObjectId)
            .HasDatabaseName("IX_Users_AzureAdObjectId");

        builder.HasIndex(x => x.Role)
            .HasDatabaseName("IX_Users_Role");
    }
}

/// <summary>
/// Patient entity configuration
/// </summary>
public class PatientConfiguration : IEntityTypeConfiguration<Patient>
{
    public void Configure(EntityTypeBuilder<Patient> builder)
    {
        builder.ToTable("Patients", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.MRN)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.FirstName)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.LastName)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Sex)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(x => x.Phone)
            .HasMaxLength(20);

        builder.Property(x => x.Email)
            .HasMaxLength(255);

        builder.Property(x => x.AddressLine1)
            .HasMaxLength(200);

        builder.Property(x => x.AddressLine2)
            .HasMaxLength(200);

        builder.Property(x => x.City)
            .HasMaxLength(100);

        builder.Property(x => x.State)
            .HasMaxLength(50);

        builder.Property(x => x.ZipCode)
            .HasMaxLength(20);

        builder.Property(x => x.PrimaryLanguage)
            .HasMaxLength(50)
            .HasDefaultValue("English");

        // Ignore computed property
        builder.Ignore(x => x.Age);
        builder.Ignore(x => x.FullName);

        // Indexes
        builder.HasIndex(x => x.MRN)
            .IsUnique()
            .HasDatabaseName("IX_Patients_MRN");

        builder.HasIndex(x => new { x.LastName, x.FirstName })
            .HasDatabaseName("IX_Patients_Name");

        builder.HasIndex(x => x.DateOfBirth)
            .HasDatabaseName("IX_Patients_DOB");
    }
}

/// <summary>
/// Encounter entity configuration
/// </summary>
public class EncounterConfiguration : IEntityTypeConfiguration<Encounter>
{
    public void Configure(EntityTypeBuilder<Encounter> builder)
    {
        builder.ToTable("Encounters", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.EncounterNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.Type)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.Status)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(x => x.ChiefComplaint)
            .HasMaxLength(500);

        // Relationships
        builder.HasOne(x => x.Patient)
            .WithMany(p => p.Encounters)
            .HasForeignKey(x => x.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Provider)
            .WithMany()
            .HasForeignKey(x => x.ProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(x => x.EncounterNumber)
            .IsUnique()
            .HasDatabaseName("IX_Encounters_Number");

        builder.HasIndex(x => x.PatientId)
            .HasDatabaseName("IX_Encounters_PatientId");

        builder.HasIndex(x => x.ProviderId)
            .HasDatabaseName("IX_Encounters_ProviderId");

        builder.HasIndex(x => x.Status)
            .HasDatabaseName("IX_Encounters_Status");

        builder.HasIndex(x => x.ScheduledAt)
            .HasDatabaseName("IX_Encounters_ScheduledAt");
    }
}

/// <summary>
/// Allergy entity configuration
/// </summary>
public class AllergyConfiguration : IEntityTypeConfiguration<Allergy>
{
    public void Configure(EntityTypeBuilder<Allergy> builder)
    {
        builder.ToTable("Allergies", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Allergen)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.Reaction)
            .HasMaxLength(500);

        builder.Property(x => x.Severity)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Relationships
        builder.HasOne(x => x.Patient)
            .WithMany(p => p.Allergies)
            .HasForeignKey(x => x.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes
        builder.HasIndex(x => x.PatientId)
            .HasDatabaseName("IX_Allergies_PatientId");

        builder.HasIndex(x => new { x.PatientId, x.Allergen })
            .HasDatabaseName("IX_Allergies_PatientId_Allergen");
    }
}

/// <summary>
/// Medical condition entity configuration
/// </summary>
public class MedicalConditionConfiguration : IEntityTypeConfiguration<MedicalCondition>
{
    public void Configure(EntityTypeBuilder<MedicalCondition> builder)
    {
        builder.ToTable("MedicalConditions", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Code)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.Name)
            .HasMaxLength(500)
            .IsRequired();

        // Relationships
        builder.HasOne(x => x.Patient)
            .WithMany(p => p.Conditions)
            .HasForeignKey(x => x.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes
        builder.HasIndex(x => x.PatientId)
            .HasDatabaseName("IX_MedicalConditions_PatientId");

        builder.HasIndex(x => x.Code)
            .HasDatabaseName("IX_MedicalConditions_Code");
    }
}
