using Microsoft.Extensions.Logging;

namespace ATTENDING.Infrastructure.Resilience;

/// <summary>
/// Circuit breaker policy for database operations.
/// Complements EF Core's EnableRetryOnFailure by stopping all attempts
/// when the database is confirmed unreachable, preventing thread pool exhaustion.
/// </summary>
public interface IDbCircuitBreakerPolicy
{
    Task<T> ExecuteAsync<T>(Func<Task<T>> action, CancellationToken cancellationToken = default);
    Task ExecuteAsync(Func<Task> action, CancellationToken cancellationToken = default);
    CircuitState State { get; }
}

public enum CircuitState
{
    Closed,      // Normal operation
    Open,        // Blocking all calls
    HalfOpen     // Testing if service recovered
}

public class DbCircuitBreakerPolicy : IDbCircuitBreakerPolicy
{
    private readonly ILogger<DbCircuitBreakerPolicy> _logger;
    private readonly SemaphoreSlim _lock = new(1, 1);
    
    private CircuitState _state = CircuitState.Closed;
    private int _failureCount;
    private DateTime _lastFailureTime = DateTime.MinValue;
    private DateTime _circuitOpenedAt = DateTime.MinValue;
    
    // Configuration
    private const int FailureThreshold = 5;
    private static readonly TimeSpan OpenDuration = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan FailureWindow = TimeSpan.FromMinutes(1);
    
    public CircuitState State => _state;

    public DbCircuitBreakerPolicy(ILogger<DbCircuitBreakerPolicy> logger)
    {
        _logger = logger;
    }

    public async Task<T> ExecuteAsync<T>(Func<Task<T>> action, CancellationToken cancellationToken = default)
    {
        EnsureCircuitAllowsExecution();
        
        try
        {
            var result = await action();
            OnSuccess();
            return result;
        }
        catch (Exception ex) when (IsTransientDatabaseException(ex))
        {
            OnFailure(ex);
            throw;
        }
    }

    public async Task ExecuteAsync(Func<Task> action, CancellationToken cancellationToken = default)
    {
        EnsureCircuitAllowsExecution();
        
        try
        {
            await action();
            OnSuccess();
        }
        catch (Exception ex) when (IsTransientDatabaseException(ex))
        {
            OnFailure(ex);
            throw;
        }
    }

    private void EnsureCircuitAllowsExecution()
    {
        if (_state == CircuitState.Open)
        {
            if (DateTime.UtcNow - _circuitOpenedAt >= OpenDuration)
            {
                _state = CircuitState.HalfOpen;
                _logger.LogInformation(
                    "Database circuit breaker transitioning to HalfOpen after {Duration}s cool-down",
                    OpenDuration.TotalSeconds);
            }
            else
            {
                _logger.LogWarning("Database circuit breaker is Open — rejecting operation");
                throw new CircuitBreakerOpenException(
                    "Database circuit breaker is open. The database appears to be unreachable. " +
                    "Retry after " + (OpenDuration - (DateTime.UtcNow - _circuitOpenedAt)).TotalSeconds.ToString("F0") + "s.");
            }
        }
    }

    private void OnSuccess()
    {
        if (_state == CircuitState.HalfOpen)
        {
            _logger.LogInformation("Database circuit breaker closing — database recovered");
        }
        _state = CircuitState.Closed;
        _failureCount = 0;
    }

    private void OnFailure(Exception ex)
    {
        // Reset failure count if outside the failure window
        if (DateTime.UtcNow - _lastFailureTime > FailureWindow)
        {
            _failureCount = 0;
        }

        _failureCount++;
        _lastFailureTime = DateTime.UtcNow;

        if (_state == CircuitState.HalfOpen || _failureCount >= FailureThreshold)
        {
            _state = CircuitState.Open;
            _circuitOpenedAt = DateTime.UtcNow;
            _logger.LogError(ex,
                "Database circuit breaker opened after {Count} failures in {Window}s. " +
                "All database operations will be rejected for {Duration}s",
                _failureCount, FailureWindow.TotalSeconds, OpenDuration.TotalSeconds);
        }
        else
        {
            _logger.LogWarning(ex,
                "Database transient failure {Count}/{Threshold}",
                _failureCount, FailureThreshold);
        }
    }

    private static bool IsTransientDatabaseException(Exception ex)
    {
        return ex is Microsoft.Data.SqlClient.SqlException sqlEx && IsTransientSqlError(sqlEx.Number)
            || ex is TimeoutException
            || ex is System.Net.Sockets.SocketException
            || ex.InnerException is Microsoft.Data.SqlClient.SqlException innerSql && IsTransientSqlError(innerSql.Number)
            || ex.InnerException is TimeoutException
            || ex.InnerException is System.Net.Sockets.SocketException;
    }

    private static bool IsTransientSqlError(int errorNumber)
    {
        // Common transient SQL Server error numbers
        return errorNumber is
            -2 or     // Timeout
            20 or     // Instance does not support encryption
            64 or     // Connection was successfully established but then an error occurred
            233 or    // Connection closed
            10053 or  // Transport-level error
            10054 or  // Connection reset
            10060 or  // Connection timed out
            40143 or  // Connection could not be initialized
            40197 or  // Service error processing request
            40501 or  // Service busy
            40613 or  // Database unavailable
            49918 or  // Cannot process request (too many operations)
            49919 or  // Cannot process create/update request (too many operations)
            49920;    // Cannot process request (too many operations)
    }
}

public class CircuitBreakerOpenException : Exception
{
    public CircuitBreakerOpenException(string message) : base(message) { }
    public CircuitBreakerOpenException(string message, Exception inner) : base(message, inner) { }
}
