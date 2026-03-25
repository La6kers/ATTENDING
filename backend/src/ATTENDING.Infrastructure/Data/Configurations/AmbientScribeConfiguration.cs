using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Infrastructure.Data.Configurations;

/// <summary>
/// EF Core configuration for EncounterRecording (ambient scribe session aggregate root)
/// </summary>
public class EncounterRecordingConfiguration : IEntityTypeConfiguration<EncounterRecording>
{
    public void Configure(EntityTypeBuilder<EncounterRecording> builder)
    {
        builder.ToTable("EncounterRecordings", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.EncounterId).IsRequired();
        builder.Property(x => x.PatientId).IsRequired();
        builder.Property(x => x.ProviderId).IsRequired();

        builder.Property(x => x.Status)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(x => x.AudioBlobContainer)
            .HasMaxLength(200);

        builder.Property(x => x.ConsentCapturedBy)
            .HasMaxLength(200);

        builder.Property(x => x.FailureReason)
            .HasMaxLength(500);

        builder.Property(x => x.SpeechServiceRegion)
            .HasMaxLength(50);

        // One-to-many: recording → segments
        builder.HasMany(x => x.Segments)
            .WithOne(s => s.Recording)
            .HasForeignKey(s => s.RecordingId)
            .OnDelete(DeleteBehavior.Cascade);

        // One-to-one: recording → generated note
        builder.HasOne(x => x.GeneratedNote)
            .WithOne(n => n.Recording)
            .HasForeignKey<AmbientNote>(n => n.RecordingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Ignore(x => x.DomainEvents);

        // One recording per encounter
        builder.HasIndex(x => x.EncounterId)
            .IsUnique()
            .HasDatabaseName("IX_EncounterRecordings_EncounterId");

        builder.HasIndex(x => x.ProviderId)
            .HasDatabaseName("IX_EncounterRecordings_ProviderId");

        builder.HasIndex(x => x.Status)
            .HasDatabaseName("IX_EncounterRecordings_Status");

        builder.HasIndex(x => new { x.OrganizationId, x.Status })
            .HasDatabaseName("IX_EncounterRecordings_Org_Status");
    }
}

/// <summary>
/// EF Core configuration for TranscriptSegment (child of EncounterRecording)
/// </summary>
public class TranscriptSegmentConfiguration : IEntityTypeConfiguration<TranscriptSegment>
{
    public void Configure(EntityTypeBuilder<TranscriptSegment> builder)
    {
        builder.ToTable("TranscriptSegments", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.RecordingId).IsRequired();

        builder.Property(x => x.Speaker)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.SpeakerLabel)
            .HasMaxLength(100);

        builder.Property(x => x.Text)
            .HasColumnType("nvarchar(max)")
            .IsRequired();

        builder.Property(x => x.Confidence)
            .HasPrecision(5, 4);

        // Ordering index for fast transcript assembly
        builder.HasIndex(x => new { x.RecordingId, x.OffsetMs })
            .HasDatabaseName("IX_TranscriptSegments_RecordingId_OffsetMs");

        builder.HasIndex(x => x.OrganizationId)
            .HasDatabaseName("IX_TranscriptSegments_OrganizationId");
    }
}

/// <summary>
/// EF Core configuration for AmbientNote (the AI-generated SOAP note)
/// </summary>
public class AmbientNoteConfiguration : IEntityTypeConfiguration<AmbientNote>
{
    public void Configure(EntityTypeBuilder<AmbientNote> builder)
    {
        builder.ToTable("AmbientNotes", "clinical");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.RecordingId).IsRequired();
        builder.Property(x => x.EncounterId).IsRequired();

        builder.Property(x => x.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        // SOAP sections — use nvarchar(max) for clinical notes (can be long)
        builder.Property(x => x.Subjective)
            .HasColumnType("nvarchar(max)")
            .IsRequired();

        builder.Property(x => x.Objective)
            .HasColumnType("nvarchar(max)")
            .IsRequired();

        builder.Property(x => x.Assessment)
            .HasColumnType("nvarchar(max)")
            .IsRequired();

        builder.Property(x => x.Plan)
            .HasColumnType("nvarchar(max)")
            .IsRequired();

        builder.Property(x => x.ExtractedDiagnosisCodes)
            .HasMaxLength(500);

        builder.Property(x => x.ExtractedMedications)
            .HasMaxLength(1_000);

        builder.Property(x => x.FollowUpInstructions)
            .HasMaxLength(2_000);

        builder.Property(x => x.ModelVersion)
            .HasMaxLength(100)
            .IsRequired();

        // Indexes
        builder.HasIndex(x => x.EncounterId)
            .IsUnique()
            .HasDatabaseName("IX_AmbientNotes_EncounterId");

        builder.HasIndex(x => x.RecordingId)
            .IsUnique()
            .HasDatabaseName("IX_AmbientNotes_RecordingId");

        builder.HasIndex(x => x.Status)
            .HasDatabaseName("IX_AmbientNotes_Status");

        builder.HasIndex(x => x.SignedByProviderId)
            .HasDatabaseName("IX_AmbientNotes_SignedByProviderId");

        builder.HasIndex(x => new { x.OrganizationId, x.Status })
            .HasDatabaseName("IX_AmbientNotes_Org_Status");
    }
}
