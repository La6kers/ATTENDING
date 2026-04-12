using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ATTENDING.Domain.Entities;

namespace ATTENDING.Infrastructure.Data.Configurations;

public class EmergencyAccessProfileConfiguration : IEntityTypeConfiguration<EmergencyAccessProfile>
{
    public void Configure(EntityTypeBuilder<EmergencyAccessProfile> builder)
    {
        builder.ToTable("EmergencyAccessProfiles", "clinical");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GForceThreshold).HasPrecision(5, 2).HasDefaultValue(4.0m);
        builder.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => x.PatientId).IsUnique().HasDatabaseName("IX_EmergencyAccessProfiles_PatientId");
        builder.Ignore(x => x.DomainEvents);
    }
}

public class EmergencyAccessLogConfiguration : IEntityTypeConfiguration<EmergencyAccessLog>
{
    public void Configure(EntityTypeBuilder<EmergencyAccessLog> builder)
    {
        builder.ToTable("EmergencyAccessLogs", "clinical");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.PeakGForce).HasPrecision(5, 2);
        builder.Property(x => x.TriggerLatitude).HasPrecision(10, 7);
        builder.Property(x => x.TriggerLongitude).HasPrecision(10, 7);
        builder.Property(x => x.TriggerType).HasMaxLength(50);
        builder.Property(x => x.ConsentMethod).HasMaxLength(50);
        builder.Property(x => x.ResponderName).HasMaxLength(200);
        builder.Property(x => x.BadgeNumber).HasMaxLength(50);
        builder.Property(x => x.Agency).HasMaxLength(200);
        builder.Property(x => x.ResponderPhotoUri).HasMaxLength(500);
        builder.Property(x => x.SectionsViewed).HasMaxLength(200);
        builder.Property(x => x.AccessDeviceInfo).HasMaxLength(200);
        builder.HasOne<EmergencyAccessProfile>().WithMany().HasForeignKey(x => x.EmergencyAccessProfileId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => x.PatientId).HasDatabaseName("IX_EmergencyAccessLogs_PatientId");
        builder.HasIndex(x => new { x.PatientId, x.AccessGrantedAt }).HasDatabaseName("IX_EmergencyAccessLogs_PatientId_AccessGrantedAt");
        builder.Ignore(x => x.DomainEvents);
    }
}
