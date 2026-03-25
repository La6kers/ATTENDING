using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Infrastructure.Data.Configurations;

/// <summary>
/// EF Core configuration for BehavioralHealthScreening and ScreeningResponse.
///
/// Schema: clinical (same as all clinical entities)
/// Special handling:
///   - Enum columns stored as string (HL7/FHIR-compatible, readable in SQL)
///   - HasSuicideRisk and IsPartTwoProtected are indexed for dashboard queries
///   - ScreeningResponse is owned as a child table (no global query filter needed)
///   - RecommendedAction and ActionTaken stored as int for range comparisons
///     (GetActiveSuicideRiskAsync uses >= operator on RecommendedAction)
/// </summary>
public class BehavioralHealthConfiguration
    : IEntityTypeConfiguration<BehavioralHealthScreening>
{
    public void Configure(EntityTypeBuilder<BehavioralHealthScreening> builder)
    {
        builder.ToTable("BehavioralHealthScreenings", "clinical");

        builder.HasKey(s => s.Id);

        // ── Required fields ─────────────────────────────────────────────
        builder.Property(s => s.PatientId).IsRequired();
        builder.Property(s => s.AdministeredByProviderId).IsRequired();
        builder.Property(s => s.OrganizationId).IsRequired();

        // ── Enums — string storage for readability in SQL, int for action range queries
        builder.Property(s => s.Instrument)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(s => s.Status)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        // RecommendedAction stored as int to allow >= comparisons in LINQ
        builder.Property(s => s.RecommendedAction)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(s => s.ActionTaken)
            .HasConversion<int?>()
            .IsRequired(false);

        // Severity enums — nullable, instrument-specific
        builder.Property(s => s.DepressionSeverity)
            .HasConversion<string?>()
            .HasMaxLength(30);

        builder.Property(s => s.AnxietySeverity)
            .HasConversion<string?>()
            .HasMaxLength(30);

        builder.Property(s => s.SuicideIdeationLevel)
            .HasConversion<int?>()
            .IsRequired(false);

        builder.Property(s => s.SuicideBehaviorType)
            .HasConversion<int?>()
            .IsRequired(false);

        builder.Property(s => s.AlcoholRiskLevel)
            .HasConversion<string?>()
            .HasMaxLength(30);

        builder.Property(s => s.PtsdScreenResult)
            .HasConversion<string?>()
            .HasMaxLength(30);

        // ── Text fields ─────────────────────────────────────────────────
        builder.Property(s => s.ScoreInterpretation).HasMaxLength(200);
        builder.Property(s => s.ProviderActionNotes).HasMaxLength(2000);

        // Safety plan — JSON, up to 8KB (Stanley-Brown plan can be detailed)
        builder.Property(s => s.SafetyPlanJson).HasMaxLength(8000);

        // ── 42 CFR Part 2 ────────────────────────────────────────────────
        builder.Property(s => s.PartTwoConsentCapturedBy).HasMaxLength(200);

        // ── Indexes ─────────────────────────────────────────────────────
        builder.HasIndex(s => s.PatientId);
        builder.HasIndex(s => s.EncounterId).HasFilter("[EncounterId] IS NOT NULL");
        builder.HasIndex(s => s.AssessmentId).HasFilter("[AssessmentId] IS NOT NULL");
        builder.HasIndex(s => new { s.PatientId, s.Instrument })
            .HasDatabaseName("IX_BHScreenings_PatientInstrument");

        // Dashboard safety query index
        builder.HasIndex(s => new { s.HasSuicideRisk, s.Status, s.RecommendedAction })
            .HasDatabaseName("IX_BHScreenings_SafetyDashboard");

        // Multi-tenant
        builder.HasIndex(s => s.OrganizationId);

        // ── Navigation ───────────────────────────────────────────────────
        builder.HasMany(s => s.Responses)
            .WithOne(r => r.Screening)
            .HasForeignKey(r => r.ScreeningId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Audit base fields (from BaseEntity) ─────────────────────────
        builder.Property(s => s.CreatedAt).IsRequired();
        builder.Property(s => s.CreatedBy).HasMaxLength(100);
        builder.Property(s => s.ModifiedAt);
        builder.Property(s => s.ModifiedBy).HasMaxLength(100);
        builder.Property(s => s.IsDeleted).HasDefaultValue(false);
        builder.Property(s => s.RowVersion).IsRowVersion();
    }
}

public class ScreeningResponseConfiguration
    : IEntityTypeConfiguration<ScreeningResponse>
{
    public void Configure(EntityTypeBuilder<ScreeningResponse> builder)
    {
        builder.ToTable("ScreeningResponses", "clinical");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.ScreeningId).IsRequired();
        builder.Property(r => r.ItemNumber).IsRequired();
        builder.Property(r => r.QuestionText).HasMaxLength(500).IsRequired();
        builder.Property(r => r.ResponseText).HasMaxLength(200).IsRequired();
        builder.Property(r => r.ResponseValue).IsRequired();

        builder.HasIndex(r => r.ScreeningId);

        // Audit fields
        builder.Property(r => r.CreatedAt).IsRequired();
        builder.Property(r => r.CreatedBy).HasMaxLength(100);
        builder.Property(r => r.IsDeleted).HasDefaultValue(false);
        builder.Property(r => r.RowVersion).IsRowVersion();
    }
}
