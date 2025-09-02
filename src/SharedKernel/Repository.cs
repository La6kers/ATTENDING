using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace SharedKernel;
public interface IReadRepository<TEntity>
    where TEntity : class
{
    Task<bool> Any(Expression<Func<TEntity, bool>> specification, CancellationToken cancellationToken = default);
    Task<IEnumerable<TEntity>> GetAllWhere(Expression<Func<TEntity, bool>> specifications, CancellationToken cancellationToken = default);
    Task<TEntity?> GetSingleWhere(Expression<Func<TEntity, bool>> specifications, CancellationToken cancellationToken = default);
    Task<TEntity?> GetSingleByKey(object?[]? keyValues, CancellationToken cancellationToken = default);
}

public interface IReadWriteRepository<TEntity> : IReadRepository<TEntity>
    where TEntity : class
{
    Task Add(TEntity entity, CancellationToken cancellationToken = default);
    Task Add(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default);
    Task Update(TEntity entity, CancellationToken cancellationToken = default);
    Task Update(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default);
}

public class EFReadRepository<TEntity, TDbContext>(TDbContext dbContext) : IReadRepository<TEntity>
    where TEntity : class
    where TDbContext : DbContext
{
    protected readonly TDbContext _dbContext = dbContext;
    protected virtual bool _trackChanges => false;

    public async Task<bool> Any(Expression<Func<TEntity, bool>> specification, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Set<TEntity>().AnyAsync(specification, cancellationToken);
    }
    public async Task<IEnumerable<TEntity>> GetAllWhere(Expression<Func<TEntity, bool>> specifications, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Set<TEntity>().Where(specifications).ToListAsync(cancellationToken);
    }
    public async Task<TEntity?> GetSingleWhere(Expression<Func<TEntity, bool>> specifications, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Set<TEntity>().Where(specifications).AsNoTracking().FirstOrDefaultAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<TEntity?> GetSingleByKey(object?[]? keyValues, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(keyValues, nameof(keyValues));
        ArgumentOutOfRangeException.ThrowIfLessThan(keyValues.Length, 1, nameof(keyValues));

        return await _dbContext.Set<TEntity>().FindAsync(keyValues, cancellationToken);
    }
}

public class EFReadWriteRepository<TEntity, TDbContext>(TDbContext dbContext) : EFReadRepository<TEntity, TDbContext>(dbContext), IReadWriteRepository<TEntity>
    where TEntity : class
    where TDbContext : DbContext
{
    public async Task Add(TEntity entity, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(entity, nameof(entity));
        await _dbContext.Set<TEntity>().AddAsync(entity, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
    public async Task Add(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(entities, nameof(entities));
        await _dbContext.Set<TEntity>().AddRangeAsync(entities, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
    public async Task Update(TEntity entity, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(entity, nameof(entity));
        _dbContext.Set<TEntity>().Update(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
    public async Task Update(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(entities, nameof(entities));
        _dbContext.Set<TEntity>().UpdateRange(entities);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}