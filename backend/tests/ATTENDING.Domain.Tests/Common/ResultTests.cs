using FluentAssertions;
using ATTENDING.Domain.Common;
using Xunit;

namespace ATTENDING.Domain.Tests.Common;

/// <summary>
/// Tests for the Result monad — enterprise error handling foundation.
/// </summary>
public class ResultTests
{
    [Fact]
    public void Success_ShouldBeSuccessful()
    {
        var result = Result.Success();
        result.IsSuccess.Should().BeTrue();
        result.IsFailure.Should().BeFalse();
        result.Error.Should().Be(Error.None);
    }

    [Fact]
    public void Failure_ShouldContainError()
    {
        var error = Error.Custom("Test.Error", "Something went wrong");
        var result = Result.Failure(error);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Test.Error");
        result.Error.Message.Should().Be("Something went wrong");
    }

    [Fact]
    public void Combine_AllSuccess_ShouldReturnSuccess()
    {
        var combined = Result.Combine(Result.Success(), Result.Success(), Result.Success());
        combined.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Combine_OneFailure_ShouldReturnFirstFailure()
    {
        var combined = Result.Combine(
            Result.Success(),
            Result.Failure(Error.Custom("First", "First")),
            Result.Failure(Error.Custom("Second", "Second")));

        combined.IsFailure.Should().BeTrue();
        combined.Error.Code.Should().Be("First");
    }

    [Fact]
    public void GenericSuccess_ShouldContainValue()
    {
        var result = Result.Success(42);
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(42);
    }

    [Fact]
    public void GenericFailure_ValueAccess_ShouldThrow()
    {
        var result = Result.Failure<int>(Error.NotFound);
        var act = () => _ = result.Value;
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void ImplicitConversion_ShouldCreateSuccess()
    {
        Result<string> result = "hello";
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be("hello");
    }

    [Fact]
    public void Map_OnSuccess_ShouldTransformValue()
    {
        var result = Result.Success(5).Map(x => x * 2);
        result.Value.Should().Be(10);
    }

    [Fact]
    public void Map_OnFailure_ShouldPropagateError()
    {
        var result = Result.Failure<int>(Error.NotFound).Map(x => x * 2);
        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(Error.NotFound);
    }

    [Fact]
    public void Bind_OnSuccess_ShouldChainOperations()
    {
        var result = Result.Success(10)
            .Bind(x => x > 0 ? Result.Success(x.ToString()) : Result.Failure<string>(Error.Validation));

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be("10");
    }

    [Fact]
    public void Bind_OnFailure_ShouldShortCircuit()
    {
        var wasCalled = false;
        Result.Failure<int>(Error.NotFound).Bind(x =>
        {
            wasCalled = true;
            return Result.Success(x.ToString());
        });

        wasCalled.Should().BeFalse();
    }

    [Fact]
    public void Tap_OnSuccess_ShouldExecuteAction()
    {
        var captured = 0;
        Result.Success(42).Tap(x => captured = x);
        captured.Should().Be(42);
    }

    [Fact]
    public void Tap_OnFailure_ShouldNotExecuteAction()
    {
        var captured = 0;
        Result.Failure<int>(Error.NotFound).Tap(x => captured = x);
        captured.Should().Be(0);
    }

    [Fact]
    public void Match_OnSuccess_ShouldCallOnSuccess()
    {
        var output = Result.Success("data").Match(v => $"Got: {v}", e => $"Error: {e.Code}");
        output.Should().Be("Got: data");
    }

    [Fact]
    public void Match_OnFailure_ShouldCallOnFailure()
    {
        var output = Result.Failure<string>(Error.NotFound).Match(v => $"Got: {v}", e => $"Error: {e.Code}");
        output.Should().Be("Error: Error.NotFound");
    }

    [Fact]
    public void ValueOrDefault_OnSuccess_ShouldReturnValue()
    {
        Result.Success(42).ValueOrDefault(0).Should().Be(42);
    }

    [Fact]
    public void ValueOrDefault_OnFailure_ShouldReturnFallback()
    {
        Result.Failure<int>(Error.NotFound).ValueOrDefault(-1).Should().Be(-1);
    }

    [Fact]
    public void DomainErrors_Patient_NotFound_ShouldContainId()
    {
        var id = Guid.NewGuid();
        var error = DomainErrors.Patient.NotFound(id);
        error.Code.Should().Be("Patient.NotFound");
        error.Message.Should().Contain(id.ToString());
    }

    [Fact]
    public void DomainErrors_Patient_DuplicateMrn()
    {
        DomainErrors.Patient.DuplicateMrn("MRN-001").Code.Should().Be("Patient.DuplicateMrn");
    }

    [Fact]
    public void DomainErrors_Encounter_InvalidTransition()
    {
        var error = DomainErrors.Encounter.InvalidTransition("Scheduled", "Completed");
        error.Message.Should().Contain("Scheduled").And.Contain("Completed");
    }

    [Fact]
    public void DomainErrors_Concurrency_StaleData()
    {
        var error = DomainErrors.Concurrency.StaleData("Patient");
        error.Message.Should().Contain("modified by another user");
    }

    [Fact]
    public void Error_SameValues_ShouldBeEqual()
    {
        Error.Custom("Code", "Msg").Should().Be(Error.Custom("Code", "Msg"));
    }

    [Fact]
    public void Error_DifferentValues_ShouldNotBeEqual()
    {
        Error.NotFound.Should().NotBe(Error.Conflict);
    }
}
