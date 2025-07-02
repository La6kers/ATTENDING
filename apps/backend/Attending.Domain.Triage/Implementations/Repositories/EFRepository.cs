using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.ValueGeneration;
using SharedKernel.Implementations.Repositories.EntityFramework;

namespace Attending.Domain.Triage.Implementations.Repositories;
private class EFRepository<T>(TriageDbContext triageDbContext) : BaseRepository<T>
    where T : class
{
    private readonly TriageDbContext _dbContext = triageDbContext;
}

internal class TriageDbContext : DbContext
{
    public static string ConnectionStringName => "TriageConnectionString";
    public DbSet<Survey> Surveys { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {

    }

    private static class SQLProviderConfigurations
    {
        public class DesignTimeDbContextFactory : BaseSqlDesignTimeDbContextFactory<TriageDbContext>
        {
            protected override string ConnectionStringName => TriageDbContext.ConnectionStringName;
        }
    }
    private class SurveyConfiguration : IEntityTypeConfiguration<Survey>
    {
        public static SurveyConfiguration Instance { get; } = new();
        public void Configure(EntityTypeBuilder<Survey> builder)
        {
            builder.HasKey(Survey => Survey.Id);
            builder.Property(Survey => Survey.Id).HasValueGenerator()
            builder.Property(Survey => Survey.MRN)
                .HasMaxLength(20);

        }

        private class IdValueGenerator : ValueGenerator<long>
        {
            private long _currentId = 0;
            private DateTime _currentDateTime = DateTime.UtcNow;
            public override bool GeneratesTemporaryValues => false;

            public override long Next(EntityEntry entry)
            {
                     
            }
        }
    }
}
