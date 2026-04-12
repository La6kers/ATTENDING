using ATTENDING.Contracts.Responses;

namespace ATTENDING.Orders.Api.Extensions;

/// <summary>
/// Extension methods to add pagination to controller list endpoints
/// </summary>
public static class PaginationExtensions
{
    /// <summary>
    /// Apply pagination to an in-memory collection and wrap in PagedResult.
    /// For MVP: pages in-memory. Production: push to repository layer.
    /// </summary>
    public static PagedResult<T> ToPagedResult<T>(
        this IEnumerable<T> source,
        int page = 1,
        int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var items = source as IReadOnlyList<T> ?? source.ToList();
        var totalCount = items.Count;
        var paged = items
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList()
            .AsReadOnly();

        return PagedResult<T>.Create(paged, totalCount, page, pageSize);
    }
}
