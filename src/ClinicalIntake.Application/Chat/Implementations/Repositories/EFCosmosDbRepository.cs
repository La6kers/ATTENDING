using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SharedKernel;
using System.Linq.Expressions;

namespace ClinicalIntake.Application.Chat.Implementations.Repositories;

internal class EFCosmosDbRepository<T>(ClinicalIntakeChatEFCosmosDbDbContext dbContext) : IRepository<T>
        where T : class
{
    private readonly ClinicalIntakeChatEFCosmosDbDbContext _dbContext = dbContext;

    public async Task Add(T entity, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(entity, nameof(entity));
        await _dbContext.Set<T>().AddAsync(entity, cancellationToken);
    }

    public Task Add(IEnumerable<T> entities, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<bool> Any(Expression<Func<T, bool>> specification, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<IEnumerable<T>> GetAllWhere(Expression<Func<T, bool>> specifications, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<T?> GetSingleWhere(Expression<Func<T, bool>> specifications, CancellationToken cancellationToken) => throw new NotImplementedException();
    public async Task Save(CancellationToken cancellationToken) => await _dbContext.SaveChangesAsync(cancellationToken);

    public Task Update(T entity, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task Update(IEnumerable<T> entities, CancellationToken cancellationToken) => throw new NotImplementedException();
}

internal class ClinicalIntakeChatEFCosmosDbDbContext(string connectionString, string databaseName, string containerName) : DbContext()
{
    private readonly string _connectionString = connectionString;
    private readonly string _databaseName = databaseName;
    private readonly string _containerName = containerName;

    public DbSet<ChatSurvey> ChatSurveys { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        ArgumentNullException.ThrowIfNull(optionsBuilder, nameof(optionsBuilder));

        optionsBuilder.UseCosmos(_connectionString, _databaseName);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasDefaultContainer(_containerName)
            .HasShadowIds()
            .HasRootDiscriminatorInJsonId()
            .ApplyConfiguration(EntityTypeConfigurations.ChatSurveyConfiguration.Instance);
    }

    private static class EntityTypeConfigurations
    {
        public class ChatSurveyConfiguration : IEntityTypeConfiguration<ChatSurvey>
        {
            public static readonly ChatSurveyConfiguration Instance = new();
            private ChatSurveyConfiguration() { }

            public void Configure(EntityTypeBuilder<ChatSurvey> builder)
            {
                builder.HasKey(s => s.ClinicId);
                builder.Property(s => s.MedicalRecordNumber).IsRequired();
                builder.Property(s => s.Summary);
                builder.OwnsMany(s => s.Messages, messageBuilder =>
                {
                    messageBuilder.Property(m => m.Role).HasConversion<string>();
                    messageBuilder.Property(m => m.Text);
                });
            }
        }
    }
}
