using ATTENDING.Domain.Enums;

namespace ATTENDING.Domain.Common;

/// <summary>
/// Represents the outcome of an operation that can succeed or fail.
/// Replaces exception-based control flow for business-rule violations.
/// </summary>
public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error Error { get; }

    protected Result(bool isSuccess, Error error)
    {
        if (isSuccess && error != Error.None)
            throw new InvalidOperationException("Success result cannot have an error.");
        if (!isSuccess && error == Error.None)
            throw new InvalidOperationException("Failure result must have an error.");

        IsSuccess = isSuccess;
        Error = error;
    }

    public static Result Success() => new(true, Error.None);
    public static Result Failure(Error error) => new(false, error);
    public static Result<T> Success<T>(T value) => new(value, true, Error.None);
    public static Result<T> Failure<T>(Error error) => new(default, false, error);

    /// <summary>Convenience overload: create a failure from a message string</summary>
    public static Result Failure(string message) => new(false, Error.Custom("Error.General", message));
    public static Result<T> Failure<T>(string message) => new(default, false, Error.Custom("Error.General", message));

    /// <summary>
    /// Combine multiple results — returns first failure or success
    /// </summary>
    public static Result Combine(params Result[] results)
    {
        foreach (var result in results)
        {
            if (result.IsFailure) return result;
        }
        return Success();
    }
}

/// <summary>
/// Typed result carrying a value on success
/// </summary>
public class Result<T> : Result
{
    private readonly T? _value;

    public T Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("Cannot access value of a failed result.");

    internal Result(T? value, bool isSuccess, Error error) : base(isSuccess, error)
    {
        _value = value;
    }

    /// <summary>Convenience overload: create a typed failure from a message string</summary>
    public new static Result<T> Failure(string message) => new(default, false, Error.Custom("Error.General", message));

    public static implicit operator Result<T>(T value) => Success(value);

    /// <summary>
    /// Transform the success value
    /// </summary>
    public Result<TOut> Map<TOut>(Func<T, TOut> mapper)
    {
        return IsSuccess
            ? Result.Success(mapper(Value))
            : Result.Failure<TOut>(Error);
    }

    /// <summary>
    /// Chain operations that return Results
    /// </summary>
    public Result<TOut> Bind<TOut>(Func<T, Result<TOut>> binder)
    {
        return IsSuccess ? binder(Value) : Result.Failure<TOut>(Error);
    }

    /// <summary>
    /// Execute action on success, return self for chaining
    /// </summary>
    public Result<T> Tap(Action<T> action)
    {
        if (IsSuccess) action(Value);
        return this;
    }

    /// <summary>
    /// Return the value or a fallback on failure
    /// </summary>
    public T ValueOrDefault(T fallback) => IsSuccess ? Value : fallback;

    /// <summary>
    /// Pattern match on success/failure
    /// </summary>
    public TOut Match<TOut>(Func<T, TOut> onSuccess, Func<Error, TOut> onFailure)
    {
        return IsSuccess ? onSuccess(Value) : onFailure(Error);
    }
}

/// <summary>
/// Strongly-typed error with code and message for consistent API responses
/// </summary>
public sealed record Error(string Code, string Message)
{
    public static readonly Error None = new(string.Empty, string.Empty);

    // ---- General ----
    public static readonly Error NullValue = new("Error.NullValue", "A required value was null.");
    public static readonly Error NotFound = new("Error.NotFound", "The requested resource was not found.");
    public static readonly Error Conflict = new("Error.Conflict", "A conflict occurred with the current state.");
    public static readonly Error Forbidden = new("Error.Forbidden", "You do not have permission to perform this action.");
    public static readonly Error Validation = new("Error.Validation", "One or more validation errors occurred.");

    /// <summary>Create a custom error</summary>
    public static Error Custom(string code, string message) => new(code, message);
}

/// <summary>
/// Domain-specific errors organized by aggregate
/// </summary>
public static class DomainErrors
{
    public static class Patient
    {
        public static Error NotFound(Guid id) => new("Patient.NotFound", $"Patient with ID '{id}' was not found.");
        public static Error DuplicateMrn(string mrn) => new("Patient.DuplicateMrn", $"A patient with MRN '{mrn}' already exists.");
        public static Error Inactive(Guid id) => new("Patient.Inactive", $"Patient '{id}' is inactive.");
    }

    public static class Encounter
    {
        public static Error NotFound(Guid id) => new("Encounter.NotFound", $"Encounter with ID '{id}' was not found.");
        public static Error InvalidTransition(string from, string to) =>
            new("Encounter.InvalidTransition", $"Cannot transition from '{from}' to '{to}'.");
        public static readonly Error AlreadyCompleted = new("Encounter.AlreadyCompleted", "This encounter has already been completed.");
    }

    public static class LabOrder
    {
        public static Error NotFound(Guid id) => new("LabOrder.NotFound", $"Lab order with ID '{id}' was not found.");
        public static readonly Error AlreadyCancelled = new("LabOrder.AlreadyCancelled", "This lab order has already been cancelled.");
        public static Error CannotCancel(string status) =>
            new("LabOrder.CannotCancel", $"Cannot cancel a lab order in '{status}' status.");
        public static readonly Error InvalidResult = new("LabOrder.InvalidResult", "Lab result data is invalid.");
        public static Error CannotUpdatePriority(string status) =>
            new("LabOrder.InvalidTransition", $"Cannot update priority of a lab order in '{status}' status. Only pending orders can be updated.");
        public static Error CannotCollect(string status) =>
            new("LabOrder.InvalidTransition", $"Cannot mark a lab order in '{status}' status as collected. Only pending orders can be collected.");
        public static Error CannotAddResult(string status) =>
            new("LabOrder.InvalidTransition", $"Cannot add results to a lab order in '{status}' status. Only collected or processing orders accept results.");
    }

    public static class Assessment
    {
        public static Error NotFound(Guid id) => new("Assessment.NotFound", $"Assessment with ID '{id}' was not found.");
        public static readonly Error AlreadyCompleted = new("Assessment.AlreadyCompleted", "This assessment has already been completed.");
        public static Error InvalidPhase(string phase) =>
            new("Assessment.InvalidPhase", $"Assessment cannot proceed from phase '{phase}'.");
    }

    public static class User
    {
        public static Error NotFound(Guid id) => new("User.NotFound", $"User with ID '{id}' was not found.");
        public static Error DuplicateEmail(string email) => new("User.DuplicateEmail", $"A user with email '{email}' already exists.");
    }

    public static class ImagingOrder
    {
        public static Error NotFound(Guid id) => new("ImagingOrder.NotFound", $"Imaging order with ID '{id}' was not found.");
        public static Error CannotCancel(string status) =>
            new("ImagingOrder.CannotCancel", $"Cannot cancel an imaging order in '{status}' status.");
    }

    public static class ClinicalOrder
    {
        public static readonly Error CannotCancelCompleted = new("Order.CannotCancelCompleted", "Cannot cancel a completed order.");
        public static readonly Error AlreadyCompleted = new("Order.AlreadyCompleted", "This order has already been completed.");
    }

    public static class Concurrency
    {
        public static Error StaleData(string entity) =>
            new("Concurrency.StaleData", $"The {entity} was modified by another user. Please refresh and try again.");
    }

    public static class BehavioralHealth
    {
        public static Error ScreeningNotFound(Guid id) =>
            new("BehavioralHealth.NotFound", $"Behavioral health screening with ID '{id}' was not found.");
        public static Error AlreadyScored(Guid id) =>
            new("BehavioralHealth.AlreadyScored", $"Screening '{id}' has already been scored.");
        public static Error CssrsRequiresEnumInputs() =>
            new("BehavioralHealth.InvalidInput", "C-SSRS scoring requires CssrsIdeationLevel and CssrsBehaviorType.");
        public static Error UnsupportedInstrument(ScreeningInstrument instrument) =>
            new("BehavioralHealth.UnsupportedInstrument", $"Scoring for instrument '{instrument}' is not yet implemented.");
    }
}
