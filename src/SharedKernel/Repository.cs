using System.Linq.Expressions;

namespace SharedKernel;
public interface IRepository<T>
    where T : class
{
    Task<bool> Any(Expression<Func<T, bool>> specification, CancellationToken cancellationToken);
    Task<IEnumerable<T>> GetAllWhere(Expression<Func<T, bool>> specifications, CancellationToken cancellationToken);
    Task<T?> GetSingleWhere(Expression<Func<T, bool>> specifications, CancellationToken cancellationToken);
    Task Add(T entity, CancellationToken cancellationToken);
    Task Add(IEnumerable<T> entities, CancellationToken cancellationToken);
    Task Update(T entity, CancellationToken cancellationToken);
    Task Update(IEnumerable<T> entities, CancellationToken cancellationToken);
    Task Save(CancellationToken cancellationToken);
}