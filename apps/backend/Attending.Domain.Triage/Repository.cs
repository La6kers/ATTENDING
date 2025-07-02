using Microsoft.Extensions.DependencyInjection;
using System.Linq.Expressions;

namespace Attending.Domain.Triage;
public abstract class BaseRepository<T>
    where T : class
{
    internal IQueryable<T> AsQueryable => asQueryable();

    internal protected abstract Task Add(T entity, CancellationToken cancellationToken);
    internal protected abstract Task Add(IEnumerable<T> entities, CancellationToken cancellationToken);
    internal protected abstract Task<bool> Any(Expression<Func<T, bool>> specification, CancellationToken cancellationToken);
    internal protected abstract Task Delete(T entity, CancellationToken cancellationToken);
    internal protected abstract Task Delete(IEnumerable<T> entities, CancellationToken cancellationToken);
    internal protected abstract Task<IEnumerable<T>> GetAllWhere(Expression<Func<T, bool>> specifications, CancellationToken cancellationToken);
    internal protected abstract Task<T?> GetSingleWhere(Expression<Func<T, bool>> specifications, CancellationToken cancellationToken);
    internal protected abstract Task Update(T entity, CancellationToken cancellationToken);
    internal protected abstract Task Update(IEnumerable<T> entities, CancellationToken cancellationToken);
    internal protected abstract Task Save(CancellationToken cancellationToken);

    protected abstract IQueryable<T> asQueryable();
}

public class RepositoryFactory<TRepository, TEntity>(IServiceProvider serviceProvider)
    where TRepository : BaseRepository<TEntity>
    where TEntity : class
{
    private readonly IServiceProvider _serviceProvider = serviceProvider;

    public ScopedRepository<TEntity> Create()
    {
        var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<TRepository>();
        return new(scope, repository);
    }
}

public class ScopedRepository<T>(IServiceScope scope, BaseRepository<T> repository) : BaseRepository<T>, IDisposable
    where T : class
{
    private readonly IServiceScope _scope = scope;
    private readonly BaseRepository<T> _repository = repository;

    protected override IQueryable<T> asQueryable() => _repository.AsQueryable;
    protected internal override async Task Add(T entity, CancellationToken cancellationToken) => await _repository.Add(entity, cancellationToken).ConfigureAwait(false);
    protected internal override async Task Add(IEnumerable<T> entities, CancellationToken cancellationToken) => await _repository.Add(entities, cancellationToken).ConfigureAwait(false);
    protected internal override async Task<bool> Any(Expression<Func<T, bool>> specification, CancellationToken cancellationToken) => await _repository.Any(specification, cancellationToken).ConfigureAwait(false);
    protected internal override async Task Delete(T entity, CancellationToken cancellationToken) => await _repository.Delete(entity, cancellationToken).ConfigureAwait(false);
    protected internal override async Task Delete(IEnumerable<T> entities, CancellationToken cancellationToken) => await _repository.Delete(entities, cancellationToken).ConfigureAwait(false);
    protected internal override async Task<IEnumerable<T>> GetAllWhere(Expression<Func<T, bool>> specifications, CancellationToken cancellationToken) => await _repository.GetAllWhere(specifications, cancellationToken).ConfigureAwait(false);
    protected internal override async Task<T?> GetSingleWhere(Expression<Func<T, bool>> specifications, CancellationToken cancellationToken) => await _repository.GetSingleWhere(specifications, cancellationToken).ConfigureAwait(false);
    protected internal override async Task Save(CancellationToken cancellationToken) => await _repository.Save(cancellationToken).ConfigureAwait(false);
    protected internal override async Task Update(T entity, CancellationToken cancellationToken) => await _repository.Update(entity, cancellationToken).ConfigureAwait(false);
    protected internal override async Task Update(IEnumerable<T> entities, CancellationToken cancellationToken) => await _repository.Update(entities, cancellationToken).ConfigureAwait(false);
    public void Dispose() => _scope.Dispose();
}