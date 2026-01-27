using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Infrastructure.Data.Configurations;

/// <summary>
/// Lab Order entity configuration
/// </summary>
public class LabOrderConfiguration : IEntityTypeConfiguration<LabOrder>
{
    public void Configure(EntityTypeBuilder<LabOrder> builder)
    {
        builder.ToTable("LabOrders", "clinical");

        builder.HasKey(x => x.Id);

        // Order identification
        builder.Property(x => x.OrderNumber)
            .HasMaxLength(50)
            .IsRequired();

        // Order details
        builder.Property(x => x.TestCode)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.TestName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.CptCode)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(x => x.CptDescription)
            .HasMaxLength(500);

        builder.Property(x => x.CptBasePrice)
            .HasPrecision(10, 2);

        builder.Property(x => x.LoincCode)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.Category)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.Priority)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(x => x.ClinicalIndication)
            .HasMaxLength(1000)
            .IsRequired();

        builder.Property(x => x.DiagnosisCode)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(x => x.DiagnosisDescription)
            .HasMaxLength(500);

        builder.Property(x => x.RedFlagReason)
            .HasMaxLength(500);

        builder.Property(x => x.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Relationships
        builder.HasOne(x => x.Patient)
            .WithMany(p => p.LabOrders)
            .HasForeignKey(x => x.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Encounter)
            .WithMany(e => e.LabOrders)
            .HasForeignKey(x => x.EncounterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.OrderingProvider)
            .WithMany()
            .HasForeignKey(x => x.OrderingProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        // Result (one-to-one)
        builder.HasOne(x => x.Result)
            .WithOne(r => r.LabOrder)
            .HasForeignKey<LabResult>(r => r.LabOrderId);

        // Ignore domain events
        builder.Ignore(x => x.DomainEvents);

        // Indexes
        builder.HasIndex(x => x.OrderNumber)
            .IsUnique()
            .HasDatabaseName("IX_LabOrders_OrderNumber");

        builder.HasIndex(x => x.PatientId)
            .HasDatabaseName("IX_LabOrders_PatientId");

        builder.HasIndex(x => x.EncounterId)
            .HasDatabaseName("IX_LabOrders_EncounterId");

        builder.HasIndex(x => x.Status)
            .HasDatabaseName("IX_LabOrders_Status");

        builder.HasIndex(x => x.OrderedAt)
            .HasDatabaseName("IX_LabOrders_OrderedAt");

        builder.HasIndex(x => new { x.PatientId, x.Status })
            .HasDatabaseName("IX_LabOrders_PatientId_Status");

        builder.HasIndex(x => x.Priority)
            .HasFilter("[Priority] = 'Stat'")
            .HasDatabaseName("IX_LabOrders_Stat");
    }
}

/// <summary>
/// Lab Result entity configuration
/// </summary>
public class LabResultConfiguration : IEntityTypeConfiguration<LabResult>
{
    public void Configure(EntityTypeBuilder<LabResult> builder)
    {
        builder.ToTable("LabResults", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Value)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Unit)
            .HasMaxLength(50);

        builder.Property(x => x.ReferenceRangeLow)
            .HasPrecision(18, 4);

        builder.Property(x => x.ReferenceRangeHigh)
            .HasPrecision(18, 4);

        builder.Property(x => x.ReferenceRangeText)
            .HasMaxLength(100);

        builder.Property(x => x.Interpretation)
            .HasMaxLength(20);

        builder.Property(x => x.PerformingLab)
            .HasMaxLength(200);

        builder.Property(x => x.ResultedBy)
            .HasMaxLength(200);

        builder.Property(x => x.Comments)
            .HasColumnType("nvarchar(max)");

        // Indexes
        builder.HasIndex(x => x.LabOrderId)
            .IsUnique()
            .HasDatabaseName("IX_LabResults_LabOrderId");

        builder.HasIndex(x => x.IsCritical)
            .HasFilter("[IsCritical] = 1")
            .HasDatabaseName("IX_LabResults_Critical");
    }
}

/// <summary>
/// Imaging Order entity configuration
/// </summary>
public class ImagingOrderConfiguration : IEntityTypeConfiguration<ImagingOrder>
{
    public void Configure(EntityTypeBuilder<ImagingOrder> builder)
    {
        builder.ToTable("ImagingOrders", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.OrderNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.StudyCode)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.StudyName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.Modality)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.BodyPart)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Laterality)
            .HasMaxLength(20);

        builder.Property(x => x.CptCode)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(x => x.Priority)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(x => x.ClinicalIndication)
            .HasMaxLength(1000)
            .IsRequired();

        builder.Property(x => x.DiagnosisCode)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(x => x.EstimatedRadiationDose)
            .HasPrecision(10, 4);

        builder.Property(x => x.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Relationships
        builder.HasOne(x => x.Patient)
            .WithMany()
            .HasForeignKey(x => x.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Encounter)
            .WithMany()
            .HasForeignKey(x => x.EncounterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.OrderingProvider)
            .WithMany()
            .HasForeignKey(x => x.OrderingProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Result)
            .WithOne(r => r.ImagingOrder)
            .HasForeignKey<ImagingResult>(r => r.ImagingOrderId);

        builder.Ignore(x => x.DomainEvents);

        // Indexes
        builder.HasIndex(x => x.OrderNumber)
            .IsUnique()
            .HasDatabaseName("IX_ImagingOrders_OrderNumber");

        builder.HasIndex(x => x.PatientId)
            .HasDatabaseName("IX_ImagingOrders_PatientId");

        builder.HasIndex(x => x.Modality)
            .HasDatabaseName("IX_ImagingOrders_Modality");

        builder.HasIndex(x => x.Status)
            .HasDatabaseName("IX_ImagingOrders_Status");
    }
}

/// <summary>
/// Imaging Result entity configuration
/// </summary>
public class ImagingResultConfiguration : IEntityTypeConfiguration<ImagingResult>
{
    public void Configure(EntityTypeBuilder<ImagingResult> builder)
    {
        builder.ToTable("ImagingResults", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Findings)
            .HasColumnType("nvarchar(max)")
            .IsRequired();

        builder.Property(x => x.Impression)
            .HasColumnType("nvarchar(max)")
            .IsRequired();

        builder.Property(x => x.CriticalFindingsDescription)
            .HasMaxLength(1000);

        builder.Property(x => x.ReadingRadiologist)
            .HasMaxLength(200);

        // Indexes
        builder.HasIndex(x => x.ImagingOrderId)
            .IsUnique()
            .HasDatabaseName("IX_ImagingResults_ImagingOrderId");

        builder.HasIndex(x => x.HasCriticalFindings)
            .HasFilter("[HasCriticalFindings] = 1")
            .HasDatabaseName("IX_ImagingResults_Critical");
    }
}

/// <summary>
/// Medication Order entity configuration
/// </summary>
public class MedicationOrderConfiguration : IEntityTypeConfiguration<MedicationOrder>
{
    public void Configure(EntityTypeBuilder<MedicationOrder> builder)
    {
        builder.ToTable("MedicationOrders", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.OrderNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.MedicationCode)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.MedicationName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.GenericName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.Strength)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.Form)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.Route)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.Frequency)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Dosage)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Instructions)
            .HasMaxLength(1000);

        builder.Property(x => x.ClinicalIndication)
            .HasMaxLength(1000)
            .IsRequired();

        builder.Property(x => x.DiagnosisCode)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(x => x.DeaSchedule)
            .HasMaxLength(10);

        builder.Property(x => x.PharmacyId)
            .HasMaxLength(50);

        builder.Property(x => x.PharmacyName)
            .HasMaxLength(200);

        builder.Property(x => x.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(x => x.DiscontinuedReason)
            .HasMaxLength(500);

        // Relationships
        builder.HasOne(x => x.Patient)
            .WithMany()
            .HasForeignKey(x => x.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Encounter)
            .WithMany()
            .HasForeignKey(x => x.EncounterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.OrderingProvider)
            .WithMany()
            .HasForeignKey(x => x.OrderingProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Ignore(x => x.DomainEvents);

        // Indexes
        builder.HasIndex(x => x.OrderNumber)
            .IsUnique()
            .HasDatabaseName("IX_MedicationOrders_OrderNumber");

        builder.HasIndex(x => x.PatientId)
            .HasDatabaseName("IX_MedicationOrders_PatientId");

        builder.HasIndex(x => x.Status)
            .HasDatabaseName("IX_MedicationOrders_Status");

        builder.HasIndex(x => new { x.PatientId, x.Status })
            .HasDatabaseName("IX_MedicationOrders_PatientId_Status");

        builder.HasIndex(x => x.IsControlledSubstance)
            .HasFilter("[IsControlledSubstance] = 1")
            .HasDatabaseName("IX_MedicationOrders_Controlled");
    }
}

/// <summary>
/// Referral entity configuration
/// </summary>
public class ReferralConfiguration : IEntityTypeConfiguration<Referral>
{
    public void Configure(EntityTypeBuilder<Referral> builder)
    {
        builder.ToTable("Referrals", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ReferralNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.Specialty)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Urgency)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(x => x.ClinicalQuestion)
            .HasMaxLength(2000)
            .IsRequired();

        builder.Property(x => x.DiagnosisCode)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(x => x.ReasonForReferral)
            .HasMaxLength(2000);

        builder.Property(x => x.ReferredToProviderId)
            .HasMaxLength(50);

        builder.Property(x => x.ReferredToProviderName)
            .HasMaxLength(200);

        builder.Property(x => x.ReferredToFacility)
            .HasMaxLength(200);

        builder.Property(x => x.ReferredToPhone)
            .HasMaxLength(20);

        builder.Property(x => x.ReferredToFax)
            .HasMaxLength(20);

        builder.Property(x => x.InsuranceAuthNumber)
            .HasMaxLength(50);

        builder.Property(x => x.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(x => x.ConsultNotes)
            .HasColumnType("nvarchar(max)");

        // Relationships
        builder.HasOne(x => x.Patient)
            .WithMany()
            .HasForeignKey(x => x.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Encounter)
            .WithMany()
            .HasForeignKey(x => x.EncounterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ReferringProvider)
            .WithMany()
            .HasForeignKey(x => x.ReferringProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Ignore(x => x.DomainEvents);

        // Indexes
        builder.HasIndex(x => x.ReferralNumber)
            .IsUnique()
            .HasDatabaseName("IX_Referrals_ReferralNumber");

        builder.HasIndex(x => x.PatientId)
            .HasDatabaseName("IX_Referrals_PatientId");

        builder.HasIndex(x => x.Status)
            .HasDatabaseName("IX_Referrals_Status");

        builder.HasIndex(x => x.Specialty)
            .HasDatabaseName("IX_Referrals_Specialty");
    }
}
