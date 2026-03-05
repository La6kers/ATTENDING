using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ATTENDING.Domain.Entities;

namespace ATTENDING.Infrastructure.Data.Configurations;

public class DiagnosticOutcomeConfiguration : IEntityTypeConfiguration<DiagnosticOutcome>
{
    public void Configure(EntityTypeBuilder<DiagnosticOutcome> builder)
    {
        builder.ToTable("DiagnosticOutcomes", "clinical");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.RecommendationType).HasMaxLength(50).IsRequired();
        builder.Property(x => x.AiSuggestedDiagnosis).HasMaxLength(200);
        builder.Property(x => x.AiPreTestProbability).HasPrecision(5, 4);
        builder.Property(x => x.GuidelineName).HasMaxLength(100);
        builder.Property(x => x.ConfirmedDiagnosis).HasMaxLength(200).IsRequired();
        builder.Property(x => x.ConfirmedIcd10Code).HasMaxLength(20);
        builder.Property(x => x.ConfirmingTestResult).HasMaxLength(500);
        builder.Property(x => x.ConfirmingTestLoincCode).HasMaxLength(20);

        // One outcome per encounter per recommendation type
        builder.HasIndex(x => new { x.EncounterId, x.RecommendationType })
            .IsUnique()
            .HasDatabaseName("IX_DiagnosticOutcomes_Encounter_Type");

        builder.HasIndex(x => x.IsProcessed)
            .HasFilter("[IsProcessed] = 0")
            .HasDatabaseName("IX_DiagnosticOutcomes_Unprocessed");

        builder.HasIndex(x => new { x.OrganizationId, x.CreatedAt })
            .HasDatabaseName("IX_DiagnosticOutcomes_Org_CreatedAt");
    }
}

public class LearningSignalConfiguration : IEntityTypeConfiguration<LearningSignal>
{
    public void Configure(EntityTypeBuilder<LearningSignal> builder)
    {
        builder.ToTable("LearningSignals", "clinical");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.RecommendationType).HasMaxLength(50).IsRequired();
        builder.Property(x => x.GuidelineName).HasMaxLength(100);
        builder.Property(x => x.AiSuggestedDiagnosis).HasMaxLength(200);
        builder.Property(x => x.AiPreTestProbability).HasPrecision(5, 4);
        builder.Property(x => x.ConfirmedDiagnosis).HasMaxLength(200);
        builder.Property(x => x.ConfirmedIcd10Code).HasMaxLength(20);
        builder.Property(x => x.ConfirmingTestLoincCode).HasMaxLength(20);

        // Primary query pattern: org + type + guideline + date window
        builder.HasIndex(x => new { x.OrganizationId, x.RecommendationType, x.GuidelineName, x.CreatedAt })
            .HasDatabaseName("IX_LearningSignals_Org_Type_Guideline_Date");

        builder.HasIndex(x => x.DiagnosticOutcomeId)
            .IsUnique()
            .HasDatabaseName("IX_LearningSignals_OutcomeId");
    }
}

public class DiagnosticAccuracySnapshotConfiguration
    : IEntityTypeConfiguration<DiagnosticAccuracySnapshot>
{
    public void Configure(EntityTypeBuilder<DiagnosticAccuracySnapshot> builder)
    {
        builder.ToTable("DiagnosticAccuracySnapshots", "clinical");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.RecommendationType).HasMaxLength(50).IsRequired();
        builder.Property(x => x.GuidelineName).HasMaxLength(100);

        builder.Property(x => x.Sensitivity).HasPrecision(5, 3);
        builder.Property(x => x.Precision).HasPrecision(5, 3);
        builder.Property(x => x.AcceptanceRate).HasPrecision(5, 3);
        builder.Property(x => x.AveragePredictedProbability).HasPrecision(5, 3);
        builder.Property(x => x.ActualOutcomeRate).HasPrecision(5, 3);
        builder.Property(x => x.CalibrationAdjustmentFactor).HasPrecision(5, 3);

        // Latest snapshot lookup: org + type + guideline, ordered by WindowEnd
        builder.HasIndex(x => new { x.OrganizationId, x.RecommendationType, x.GuidelineName, x.WindowEnd })
            .HasDatabaseName("IX_AccuracySnapshots_Org_Type_Guideline_WindowEnd");
    }
}
