using FluentAssertions;
using ATTENDING.Contracts.Responses;
using ATTENDING.Orders.Api.Extensions;
using Xunit;

namespace ATTENDING.Integration.Tests.Api;

public class PaginationExtensionTests
{
    private readonly List<int> _items = Enumerable.Range(1, 50).ToList();

    [Fact]
    public void ToPagedResult_FirstPage_ShouldReturnCorrectSlice()
    {
        var result = _items.ToPagedResult(page: 1, pageSize: 10);

        result.Items.Should().HaveCount(10);
        result.Items.First().Should().Be(1);
        result.Items.Last().Should().Be(10);
        result.TotalCount.Should().Be(50);
        result.Page.Should().Be(1);
        result.TotalPages.Should().Be(5);
        result.HasPreviousPage.Should().BeFalse();
        result.HasNextPage.Should().BeTrue();
    }

    [Fact]
    public void ToPagedResult_MiddlePage_ShouldReturnCorrectSlice()
    {
        var result = _items.ToPagedResult(page: 3, pageSize: 10);

        result.Items.Should().HaveCount(10);
        result.Items.First().Should().Be(21);
        result.Items.Last().Should().Be(30);
        result.HasPreviousPage.Should().BeTrue();
        result.HasNextPage.Should().BeTrue();
    }

    [Fact]
    public void ToPagedResult_LastPage_ShouldReturnRemainder()
    {
        var result = _items.ToPagedResult(page: 5, pageSize: 10);

        result.Items.Should().HaveCount(10);
        result.Items.First().Should().Be(41);
        result.HasNextPage.Should().BeFalse();
        result.HasPreviousPage.Should().BeTrue();
    }

    [Fact]
    public void ToPagedResult_BeyondLastPage_ShouldReturnEmpty()
    {
        var result = _items.ToPagedResult(page: 10, pageSize: 10);

        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(50);
        result.HasNextPage.Should().BeFalse();
    }

    [Fact]
    public void ToPagedResult_ClampPageSize_ShouldLimitTo100()
    {
        var result = _items.ToPagedResult(page: 1, pageSize: 500);

        result.Items.Should().HaveCount(50); // only 50 items total
        result.PageSize.Should().Be(100);
    }

    [Fact]
    public void ToPagedResult_NegativePage_ShouldDefaultToOne()
    {
        var result = _items.ToPagedResult(page: -1, pageSize: 10);

        result.Page.Should().Be(1);
        result.Items.First().Should().Be(1);
    }

    [Fact]
    public void ToPagedResult_DefaultParams_ShouldUseDefaults()
    {
        var result = _items.ToPagedResult();

        result.Page.Should().Be(1);
        result.PageSize.Should().Be(20);
        result.Items.Should().HaveCount(20);
    }
}
