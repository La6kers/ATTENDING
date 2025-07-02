using FluentResults;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using SharedKernel.Domain;
using static SharedKernel.Domain.CommonReasons;

namespace Attending.Domain.Triage.Features.Commands;
public static class SubmitSurvey
{
    public static IServiceCollection AddSubmitSurveyRequestHandler(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services, nameof(services));
        services
            .AddScoped<IRequestHandler<Request, long>, Handler>()
            .AddScoped<IRequestBehavior<Request, long>, RequestValidationBehavior>();
        return services;
    }

    public record Request(Survey Survey) : IRequest<long>;

    private class Handler(RepositoryFactory<BaseRepository<Survey>, Survey> repositoryFactory) : IRequestHandler<Request, long>
    {
        private readonly RepositoryFactory<BaseRepository<Survey>, Survey> _repositoryFactory = repositoryFactory;

        public async Task<Result<long>> Handle(Request request, CancellationToken cancellationToken)
        {
            ArgumentNullException.ThrowIfNull(request, nameof(request));
            ArgumentNullException.ThrowIfNull(request.Survey, nameof(request.Survey));

            var result = Result.Ok(0L);

            using var scopedRepository = _repositoryFactory.Create();

            await scopedRepository.Add(request.Survey, cancellationToken).ConfigureAwait(false);
            await scopedRepository.Save(cancellationToken).ConfigureAwait(false);

            result.WithValue(request.Survey.Id);

            return result.WithSuccess(new RequestHandlingComplete(nameof(SubmitSurvey), RequestType.Command, result.Reasons));
        }
    }

    private class RequestValidationBehavior : IRequestBehavior<Request, long>
    {
        public async Task<Result<long>> Handle(Request request, Func<Task<Result<long>>> next, CancellationToken cancellationToken)
        {
            var validationResult = RequestValidator.Default.Validate(request);
            if(validationResult.IsValid)
            {
                var result = await next().ConfigureAwait(false);
                return result.WithSuccess(new RequestValidationSuccess(nameof(SubmitSurvey)));
            }

            return Result.Fail(new RequestValidationError(nameof(SubmitSurvey), validationResult.Errors));
        }

        private class RequestValidator : AbstractValidator<Request>
        {
            public static RequestValidator Default { get; } = new();

            public RequestValidator()
            {
                RuleFor(x => x.Survey).SetSurveyRules();
            }
        }
    }
}
