using FluentResults;
using Microsoft.Extensions.DependencyInjection;

namespace SharedKernel;

public class Mediator(IServiceProvider serviceProvider)
{
    public async Task<Result<TResponse>> Send<TRequest, TResponse>(TRequest request, CancellationToken cancellationToken = default)
        where TRequest : IRequest<TResponse>
    {
        ArgumentNullException.ThrowIfNull(request, nameof(request));
        var handler = serviceProvider.GetRequiredService<IRequestHandler<TRequest, TResponse>>();
        var behaviors = serviceProvider.GetServices<IRequestBehavior<TRequest, TResponse>>().Reverse().ToList();

        Func<Task<Result<TResponse>>> handlerDelegate = () => handler.Handle(request, cancellationToken);

        foreach(var behavior in behaviors)
            handlerDelegate = async () => await behavior.Handle(request, handlerDelegate, cancellationToken).ConfigureAwait(false);

        return await handlerDelegate().ConfigureAwait(false);
    }

    public async Task<Result> Send<TRequest>(TRequest request, CancellationToken cancellationToken = default)
        where TRequest : ICommandRequest
    {
        ArgumentNullException.ThrowIfNull(request, nameof(request));
        var handler = serviceProvider.GetRequiredService<ICommandRequestHandler<TRequest>>();
        var behaviors = serviceProvider.GetServices<ICommandRequestBehavior<TRequest>>().Reverse().ToList();

        Func<Task<Result>> handlerDelegate = () => handler.Handle(request, cancellationToken);

        foreach(var behavior in behaviors)
            handlerDelegate = () => behavior.Handle(request, handlerDelegate, cancellationToken);

        return await handlerDelegate().ConfigureAwait(false);
    }
}

public interface IRequest<out TResponse>;
public interface IRequestHandler<in TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    Task<Result<TResponse>> Handle(TRequest request, CancellationToken cancellationToken);
}
public interface IRequestBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    Task<Result<TResponse>> Handle(TRequest request, Func<Task<Result<TResponse>>> next, CancellationToken cancellationToken);
}

public interface ICommandRequest;
public interface ICommandRequestHandler<in TRequest>
    where TRequest : ICommandRequest
{
    Task<Result> Handle(TRequest request, CancellationToken cancellationToken);
}
public interface ICommandRequestBehavior<TRequest>
    where TRequest : ICommandRequest
{
    Task<Result> Handle(TRequest request, Func<Task<Result>> next, CancellationToken cancellationToken);
}