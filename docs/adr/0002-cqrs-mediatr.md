# ADR-0002: CQRS with MediatR Pipeline Behaviors

**Status:** Accepted  
**Date:** 2026-02-24  
**Decision Makers:** Engineering Team

## Context

The ATTENDING AI platform handles clinical workflows that require:

1. **Audit Trails**: Every command (create order, schedule appointment, update clinical note) must be logged with timestamp, user, and result
2. **Cross-Cutting Concerns**: Validation, authorization, error handling, and transaction management apply to all operations
3. **Complex Domain Rules**: Creating an order triggers referral notifications, appointment scheduling, and EHR integrations
4. **Query Optimization**: Reading patient history requires filtering, sorting, and pagination without exposing domain internals

Traditional service-based architecture would require wrapping each operation in auth/logging/transaction managers, leading to duplicate code and missed audit events.

## Decision

Implement **Command Query Responsibility Segregation (CQRS)** using **MediatR** with a strongly-typed pipeline:

```csharp
// Command: Intent-driven
public record CreateOrderCommand(
    Guid PatientId,
    string OrderReason,
    Guid ProviderId
) : IRequest<CreateOrderResult>;

// Handler: Orchestrates domain logic
public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, CreateOrderResult>
{
    public async Task<CreateOrderResult> Handle(CreateOrderCommand request, CancellationToken ct)
    {
        var order = Order.Create(request.PatientId, request.OrderReason, request.ProviderId);
        _repository.Add(order);
        await _unitOfWork.SaveChangesAsync(ct); // Publishes domain events
        return new CreateOrderResult(order.Id, order.Status);
    }
}

// Query: Read-only
public record GetPatientOrdersQuery(Guid PatientId, int Page = 1) : IRequest<List<OrderDto>>;
```

### MediatR Pipeline Behaviors (Middleware)

1. **ValidationBehavior**: Runs FluentValidation before handler
2. **LoggingBehavior**: Logs command/query name, arguments, and execution time
3. **TransactionBehavior**: Wraps commands in `DbContext.BeginTransaction()`
4. **AuthorizationBehavior**: Verifies user permissions against resource
5. **ErrorHandlingBehavior**: Catches domain exceptions, formats as `ProblemDetails`
6. **AuditBehavior**: Records command in audit log for HIPAA compliance

```csharp
public class AuditBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
        var startTime = DateTime.UtcNow;
        var userId = _currentUser.Id;
        
        // Log pre-execution
        _auditLog.LogCommand(typeof(TRequest).Name, userId, request);
        
        var result = await next();
        
        // Log post-execution
        _auditLog.LogCommandResult(typeof(TRequest).Name, userId, DateTime.UtcNow - startTime);
        return result;
    }
}
```

### Dependency Injection

```csharp
services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(CreateOrderCommand).Assembly);
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(AuditBehavior<,>));
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
});
```

## Consequences

### Positive
- **Single Audit Trail**: AuditBehavior captures all commands without duplication
- **Consistent Error Handling**: ErrorHandlingBehavior standardizes exceptions across the app
- **Easy Testing**: Test handlers in isolation; mock `IMediator`
- **Separation of Read/Write**: Queries use optimized SQL without loading domain entities
- **Pipeline Extensibility**: Add new behaviors (rate limiting, feature flags) without modifying handlers
- **HIPAA Compliance**: Clear audit log entry point for every state-changing operation

### Negative
- **Additional Abstraction**: Commands/Queries are extra classes (though type-safe)
- **Mediator Overhead**: Small performance cost from pipeline traversal
- **Debugging Complexity**: Stack traces become deeper with pipeline behaviors

### Risks
- **Query N+1 Problems**: Handlers might load entities inefficiently; requires careful testing
- **Domain Logic in Handlers**: Temptation to put complex logic in handlers instead of domain layer
- **Command Bloat**: Every operation needs a command + handler; discipline required to avoid 100+ commands

## Alternatives Considered

1. **Direct Service Calls** (Traditional DI)
   ```csharp
   public async Task<CreateOrderResult> CreateOrder(CreateOrderRequest request)
   {
       // Must manually add auth, validation, logging, transactions
       _logger.Log(...);
       if (!_authService.CanCreateOrder()) throw new ForbiddenException();
       _validator.Validate(request);
       using var tx = await _db.BeginTransactionAsync();
       ...
   }
   ```
   - No cross-cutting behavior pipeline
   - Audit logging easily forgotten
   - Hard to ensure consistency

2. **Minimal APIs with Inline Handlers**
   ```csharp
   app.MapPost("/orders", async (CreateOrderRequest req, IMediator mediator) =>
       await mediator.Send(new CreateOrderCommand(...)));
   ```
   - Faster development initially
   - Loses structure at scale (100+ endpoints)

3. **Event Sourcing with EventStoreDB**
   - Overkill for current requirements
   - Adds significant infrastructure complexity
   - Can combine with CQRS later if audit needs evolve

## Implementation Notes

- Commands should be **write-only**: no query string parameters, no nullable fields
- Queries should be **read-only**: use `AsNoTracking()` in EF Core
- Use `IValidator<TCommand>` from FluentValidation for strong typing
- Commands return `Result<T>` for error handling without exceptions
- Domain events auto-dispatch in `SaveChangesAsync()`; handlers run in same transaction
