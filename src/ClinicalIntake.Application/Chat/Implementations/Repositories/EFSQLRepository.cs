using Microsoft.EntityFrameworkCore;
using SharedKernel;
using System.Linq.Expressions;

namespace ClinicalIntake.Application.Chat.Implementations.Repositories;

internal class EFSQLRepository<T>(ClinicalIntakeChatEFSQLDbContext dbContext) : IRepository<T>
        where T : class
{
    private readonly ClinicalIntakeChatEFSQLDbContext _dbContext = dbContext;

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

internal class ClinicalIntakeChatEFSQLDbContext(DbContextOptions<ClinicalIntakeChatEFSQLDbContext> options) : DbContext(options)
{
    public DbSet<ChatMessage> ChatMessages { get; set; }
    public const string ConnectionStringName = "ClinicalIntakeChatDatabaseConnectionString";

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<ChatMessage>()
            .Property(c => c.Role)
            .HasConversion<string>();
        modelBuilder.Entity<ChatMessage>()
            .Property(c => c.Text)
            .IsRequired();
    }
}
