namespace ATTENDING.Domain.Exceptions;

/// <summary>
/// Base exception for all domain-layer errors.
/// Use instead of <see cref="InvalidOperationException"/> or
/// <see cref="ArgumentException"/> so callers can catch domain
/// errors distinctly from infrastructure/framework failures.
/// </summary>
public class DomainException : Exception
{
    /// <summary>Machine-readable error code for programmatic handling.</summary>
    public string Code { get; }

    public DomainException(string message, string code = "DOMAIN_ERROR")
        : base(message)
    {
        Code = code;
    }

    public DomainException(string message, Exception innerException, string code = "DOMAIN_ERROR")
        : base(message, innerException)
    {
        Code = code;
    }
}

/// <summary>
/// Raised when a domain entity is not found.
/// Maps to HTTP 404 at the API layer.
/// </summary>
public class EntityNotFoundException : DomainException
{
    public string EntityType { get; }
    public object EntityId { get; }

    public EntityNotFoundException(string entityType, object entityId)
        : base($"{entityType} with ID '{entityId}' was not found.", "ENTITY_NOT_FOUND")
    {
        EntityType = entityType;
        EntityId = entityId;
    }
}

/// <summary>
/// Raised when a domain invariant or business rule is violated.
/// Maps to HTTP 422 or 409 at the API layer.
/// </summary>
public class DomainRuleViolationException : DomainException
{
    public DomainRuleViolationException(string message, string code = "RULE_VIOLATION")
        : base(message, code)
    {
    }
}

/// <summary>
/// Raised when a state transition is invalid (e.g., assessment
/// status machine, order lifecycle).
/// Maps to HTTP 409 at the API layer.
/// </summary>
public class InvalidStateTransitionException : DomainException
{
    public string CurrentState { get; }
    public string AttemptedState { get; }

    public InvalidStateTransitionException(string currentState, string attemptedState, string entityType = "Entity")
        : base(
            $"Cannot transition {entityType} from '{currentState}' to '{attemptedState}'.",
            "INVALID_STATE_TRANSITION")
    {
        CurrentState = currentState;
        AttemptedState = attemptedState;
    }
}
