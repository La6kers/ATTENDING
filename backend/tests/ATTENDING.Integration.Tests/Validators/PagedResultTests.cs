using FluentAssertions;
using ATTENDING.Contracts.Responses;
using Xunit;

namespace ATTENDING.Integration.Tests.Validators;

public class PagedResultTests
{
    [Fact]
    public void PagedResult_ShouldCalculateTotalPages()
    {
        var items = Enumerable.Range(1, 10).ToList().AsReadOnly();
        var result = PagedResult<int>.Create(items, 50, 1, 10);

        result.TotalPages.Should().Be(5);
        result.HasNextPage.Should().BeTrue();
        result.HasPreviousPage.Should().BeFalse();
    }

    [Fact]
    public void PagedResult_LastPage_ShouldNotHaveNextPage()
    {
        var items = Enumerable.Range(1, 5).ToList().AsReadOnly();
        var result = PagedResult<int>.Create(items, 25, 5, 5);

        result.TotalPages.Should().Be(5);
        result.HasNextPage.Should().BeFalse();
        result.HasPreviousPage.Should().BeTrue();
    }

    [Fact]
    public void PagedResult_Empty_ShouldReturnEmptyResult()
    {
        var result = PagedResult<string>.Empty();

        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
        result.TotalPages.Should().Be(0);
        result.HasNextPage.Should().BeFalse();
        result.HasPreviousPage.Should().BeFalse();
    }

    [Fact]
    public void PagedResult_SinglePage_ShouldNotHavePagination()
    {
        var items = Enumerable.Range(1, 3).ToList().AsReadOnly();
        var result = PagedResult<int>.Create(items, 3, 1, 20);

        result.TotalPages.Should().Be(1);
        result.HasNextPage.Should().BeFalse();
        result.HasPreviousPage.Should().BeFalse();
    }
}
