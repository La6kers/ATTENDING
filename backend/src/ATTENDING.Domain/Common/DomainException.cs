namespace ATTENDING.Domain.Common;

/// <summary>
/// Exception thrown when a domain invariant is violated.
/// Used for precondition failures that represent programming errors
/// or invalid state transitions — not for expected business rule violations
/// (use Result for those).
/// </summary>
public class DomainException : Exception
{
    public DomainException(string message) : base(message) { }
    public DomainException(string message, Exception innerException)
        : base(message, innerException) { }
}
