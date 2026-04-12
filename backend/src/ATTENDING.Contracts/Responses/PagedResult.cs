namespace ATTENDING.Contracts.Responses;

/// <summary>
/// Paginated response wrapper for list endpoints
/// </summary>
public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; }
    public int TotalCount { get; }
    public int Page { get; }
    public int PageSize { get; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;

    public PagedResult(IReadOnlyList<T> items, int totalCount, int page, int pageSize)
    {
        Items = items;
        TotalCount = totalCount;
        Page = page;
        PageSize = pageSize;
    }

    /// <summary>
    /// Create from an already-paged collection with known total
    /// </summary>
    public static PagedResult<T> Create(IReadOnlyList<T> items, int totalCount, int page, int pageSize)
        => new(items, totalCount, page, pageSize);

    /// <summary>
    /// Create empty result
    /// </summary>
    public static PagedResult<T> Empty(int page = 1, int pageSize = 20)
        => new(Array.Empty<T>(), 0, page, pageSize);
}
