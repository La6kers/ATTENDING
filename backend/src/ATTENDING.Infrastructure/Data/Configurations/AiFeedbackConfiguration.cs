using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ATTENDING.Domain.Entities;

namespace ATTENDING.Infrastructure.Data.Configurations;

public class AiFeedbackConfiguration : IEntityTypeConfiguration<AiFeedback>
{
    public void Configure(EntityTypeBuilder<AiFeedback> builder)
    {
        builder.ToTable("AiFeedback", "clinical");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.RecommendationType).HasMaxLength(50).IsRequired();
        builder.Property(f => f.RequestId).HasMaxLength(100).IsRequired();
        builder.Property(f => f.Rating).HasMaxLength(30).IsRequired();
        builder.Property(f => f.SelectedDiagnosis).HasMaxLength(200);
        builder.Property(f => f.Comment).HasMaxLength(500);
        builder.Property(f => f.ModelVersion).HasMaxLength(50);

        builder.HasIndex(f => f.ProviderId);
        builder.HasIndex(f => f.RequestId);
        builder.HasIndex(f => f.RecommendationType);
        builder.HasIndex(f => f.CreatedAt);
    }
}
