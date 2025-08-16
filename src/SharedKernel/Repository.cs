using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace SharedKernel;
public interface IReadRepository<T>
    where T : class
{
    Task<bool> Any(Expression<Func<T, bool>> specification, CancellationToken cancellationToken);
    Task<IEnumerable<T>> GetAllWhere(Expression<Func<T, bool>> specifications, CancellationToken cancellationToken);
    Task<T?> GetSingleWhere(Expression<Func<T, bool>> specifications, CancellationToken cancellationToken);
    Task<T?> GetSingleByKey(object?[]? keyValues, CancellationToken cancellationToken);
}

public interface IReadWriteRepository<T> : IReadRepository<T>
    where T : class
{
    Task Add(T entity, CancellationToken cancellationToken);
    Task Add(IEnumerable<T> entities, CancellationToken cancellationToken);
    Task Update(T entity, CancellationToken cancellationToken);
    Task Update(IEnumerable<T> entities, CancellationToken cancellationToken);
    Task Save(CancellationToken cancellationToken);
}

public class EFReadRepository<TEntity, TDbContext>(TDbContext dbContext) : IReadRepository<TEntity>
    where TEntity : class
    where TDbContext : DbContext
{
    protected readonly TDbContext _dbContext = dbContext;

    public async Task<bool> Any(Expression<Func<TEntity, bool>> specification, CancellationToken cancellationToken)
    {
        return await _dbContext.Set<TEntity>().AnyAsync(specification, cancellationToken);
    }
    public async Task<IEnumerable<TEntity>> GetAllWhere(Expression<Func<TEntity, bool>> specifications, CancellationToken cancellationToken)
    {
        return await _dbContext.Set<TEntity>().Where(specifications).ToListAsync(cancellationToken);
    }
    public async Task<TEntity?> GetSingleWhere(Expression<Func<TEntity, bool>> specifications, CancellationToken cancellationToken)
    {
        return await _dbContext.Set<TEntity>().Where(specifications).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<TEntity?> GetSingleByKey(object?[]? keyValues, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(keyValues, nameof(keyValues));
        ArgumentOutOfRangeException.ThrowIfLessThan(keyValues.Length, 1, nameof(keyValues));

        return await _dbContext.Set<TEntity>().FindAsync(keyValues, cancellationToken);
    }
}