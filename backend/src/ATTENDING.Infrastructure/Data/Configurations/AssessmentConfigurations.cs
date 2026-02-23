using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Infrastructure.Data.Configurations;

/// <summary>
/// Patient Assessment entity configuration
/// </summary>
public class PatientAssessmentConfiguration : IEntityTypeConfiguration<PatientAssessment>
{
    public void Configure(EntityTypeBuilder<PatientAssessment> builder)
    {
        builder.ToTable("PatientAssessments", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.AssessmentNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.ChiefComplaint)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(x => x.CurrentPhase)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(x => x.TriageLevel)
            .HasConversion<string>()
            .HasMaxLength(20);

        // HPI fields
        builder.Property(x => x.HpiOnset).HasMaxLength(500);
        builder.Property(x => x.HpiLocation).HasMaxLength(500);
        builder.Property(x => x.HpiDuration).HasMaxLength(500);
        builder.Property(x => x.HpiCharacter).HasMaxLength(500);
        builder.Property(x => x.HpiAggravating).HasMaxLength(500);
        builder.Property(x => x.HpiRelieving).HasMaxLength(500);
        builder.Property(x => x.HpiTiming).HasMaxLength(500);
        builder.Property(x => x.HpiSeverity).HasMaxLength(500);
        builder.Property(x => x.HpiContext).HasMaxLength(1000);
        builder.Property(x => x.HpiAssociatedSymptoms).HasMaxLength(1000);

        // JSON fields
        builder.Property(x => x.ReviewOfSystemsJson).HasColumnType("nvarchar(max)");
        builder.Property(x => x.MedicalHistoryJson).HasColumnType("nvarchar(max)");
        builder.Property(x => x.MedicationsJson).HasColumnType("nvarchar(max)");
        builder.Property(x => x.AllergiesJson).HasColumnType("nvarchar(max)");
        builder.Property(x => x.SocialHistoryJson).HasColumnType("nvarchar(max)");
        builder.Property(x => x.RedFlagsJson).HasColumnType("nvarchar(max)");
        builder.Property(x => x.RiskFactorsJson).HasColumnType("nvarchar(max)");
        builder.Property(x => x.DifferentialDiagnosisJson).HasColumnType("nvarchar(max)");
        builder.Property(x => x.RecommendedWorkupJson).HasColumnType("nvarchar(max)");
        builder.Property(x => x.VoiceTranscript).HasColumnType("nvarchar(max)");
        builder.Property(x => x.ImageUrlsJson).HasColumnType("nvarchar(max)");

        builder.Property(x => x.EmergencyReason).HasMaxLength(500);

        // Relationships
        builder.HasOne(x => x.Patient)
            .WithMany()
            .HasForeignKey(x => x.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Encounter)
            .WithMany()
            .HasForeignKey(x => x.EncounterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ReviewedByProvider)
            .WithMany()
            .HasForeignKey(x => x.ReviewedByProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Ignore(x => x.DomainEvents);

        // Indexes
        builder.HasIndex(x => x.AssessmentNumber)
            .IsUnique()
            .HasDatabaseName("IX_Assessments_AssessmentNumber");

        builder.HasIndex(x => x.PatientId)
            .HasDatabaseName("IX_Assessments_PatientId");

        builder.HasIndex(x => x.CurrentPhase)
            .HasDatabaseName("IX_Assessments_Phase");

        builder.HasIndex(x => x.HasRedFlags)
            .HasFilter("[HasRedFlags] = 1")
            .HasDatabaseName("IX_Assessments_RedFlags");

        builder.HasIndex(x => x.IsEmergency)
            .HasFilter("[IsEmergency] = 1")
            .HasDatabaseName("IX_Assessments_Emergency");

        builder.HasIndex(x => new { x.CurrentPhase, x.HasRedFlags })
            .HasDatabaseName("IX_Assessments_Phase_RedFlags");
    }
}

/// <summary>
/// Assessment Symptom entity configuration
/// </summary>
public class AssessmentSymptomConfiguration : IEntityTypeConfiguration<AssessmentSymptom>
{
    public void Configure(EntityTypeBuilder<AssessmentSymptom> builder)
    {
        builder.ToTable("AssessmentSymptoms", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.SymptomCode)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.SymptomName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.BodySystem)
            .HasMaxLength(100);

        builder.Property(x => x.Severity)
            .HasMaxLength(50);

        builder.Property(x => x.Duration)
            .HasMaxLength(100);

        builder.Property(x => x.AdditionalNotes)
            .HasMaxLength(1000);

        // Relationships
        builder.HasOne(x => x.Assessment)
            .WithMany(a => a.Symptoms)
            .HasForeignKey(x => x.AssessmentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes
        builder.HasIndex(x => x.AssessmentId)
            .HasDatabaseName("IX_AssessmentSymptoms_AssessmentId");

        builder.HasIndex(x => new { x.AssessmentId, x.SymptomCode })
            .HasDatabaseName("IX_AssessmentSymptoms_Assessment_Code");
    }
}

/// <summary>
/// Assessment Response entity configuration
/// </summary>
public class AssessmentResponseConfiguration : IEntityTypeConfiguration<AssessmentResponse>
{
    public void Configure(EntityTypeBuilder<AssessmentResponse> builder)
    {
        builder.ToTable("AssessmentResponses", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Phase)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(x => x.Question)
            .HasMaxLength(1000)
            .IsRequired();

        builder.Property(x => x.Response)
            .HasColumnType("nvarchar(max)")
            .IsRequired();

        builder.Property(x => x.ExtractedEntities)
            .HasColumnType("nvarchar(max)");

        // Relationships
        builder.HasOne(x => x.Assessment)
            .WithMany(a => a.Responses)
            .HasForeignKey(x => x.AssessmentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes
        builder.HasIndex(x => x.AssessmentId)
            .HasDatabaseName("IX_AssessmentResponses_AssessmentId");

        builder.HasIndex(x => new { x.AssessmentId, x.Phase })
            .HasDatabaseName("IX_AssessmentResponses_Assessment_Phase");
    }
}

/// <summary>
/// Audit Log entity configuration
/// </summary>
public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs", "audit");

        builder.HasKey(x => x.Id);

        // Identity column
        builder.Property(x => x.Id)
            .UseIdentityColumn();

        builder.Property(x => x.UserEmail)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(x => x.UserRole)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.Action)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.EntityType)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.EntityId)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.IpAddress)
            .HasMaxLength(50);

        builder.Property(x => x.UserAgent)
            .HasMaxLength(500);

        builder.Property(x => x.RequestPath)
            .HasMaxLength(500);

        builder.Property(x => x.RequestMethod)
            .HasMaxLength(10);

        builder.Property(x => x.Details)
            .HasColumnType("nvarchar(max)");

        builder.Property(x => x.OldValues)
            .HasColumnType("nvarchar(max)");

        builder.Property(x => x.NewValues)
            .HasColumnType("nvarchar(max)");

        // Ignore base entity properties that don't apply to audit logs
        builder.Ignore(x => x.CreatedAt);
        builder.Ignore(x => x.ModifiedAt);
        builder.Ignore(x => x.CreatedBy);
        builder.Ignore(x => x.ModifiedBy);
        builder.Ignore(x => x.RowVersion);
        builder.Ignore(x => x.IsDeleted);
        builder.Ignore(x => x.DeletedAt);
        builder.Ignore(x => x.DeletedBy);

        // Indexes for HIPAA compliance queries
        builder.HasIndex(x => x.Timestamp)
            .HasDatabaseName("IX_AuditLogs_Timestamp");

        builder.HasIndex(x => x.UserId)
            .HasDatabaseName("IX_AuditLogs_UserId");

        builder.HasIndex(x => x.PatientId)
            .HasFilter("[PatientId] IS NOT NULL")
            .HasDatabaseName("IX_AuditLogs_PatientId");

        builder.HasIndex(x => x.Action)
            .HasDatabaseName("IX_AuditLogs_Action");

        builder.HasIndex(x => new { x.EntityType, x.EntityId })
            .HasDatabaseName("IX_AuditLogs_Entity");

        builder.HasIndex(x => new { x.Timestamp, x.UserId })
            .HasDatabaseName("IX_AuditLogs_Timestamp_UserId");

        builder.HasIndex(x => new { x.Timestamp, x.PatientId })
            .HasFilter("[PatientId] IS NOT NULL")
            .HasDatabaseName("IX_AuditLogs_Timestamp_PatientId");
    }
}
