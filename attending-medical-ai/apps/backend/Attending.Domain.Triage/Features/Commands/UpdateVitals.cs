using FluentResults;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using SharedKernel.Domain;
using static SharedKernel.Domain.CommonReasons;
using Error = SharedKernel.Domain.Error;

namespace Attending.Domain.Triage.Features.Commands;
public static class UpdateVitals
{
    public static IServiceCollection AddUpdateVitalsRequestHandler(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services, nameof(services));

        services
            .AddScoped<ICommandRequestHandler<Request>, Handler>()
            .AddScoped<ICommandRequestBehavior<Request>, RequestValidationBehavior>();

        return services;
    }

    public record Request(int SurveyId, Vitals Vitals) : ICommandRequest;

    private class Handler(RepositoryFactory<BaseRepository<Survey>, Survey> repositoryFactory) : ICommandRequestHandler<Request>
    {
        private readonly RepositoryFactory<BaseRepository<Survey>, Survey> _repositoryFactory = repositoryFactory;
        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            ArgumentNullException.ThrowIfNull(request, nameof(request));
            ArgumentNullException.ThrowIfNull(request.Vitals, nameof(request.Vitals));
            var result = Result.Ok();

            using var scopedRepository = _repositoryFactory.Create();
            var existingSurvey = await scopedRepository.GetSingleWhere(survey => survey.Id == request.SurveyId, cancellationToken).ConfigureAwait(false);
            if(existingSurvey is null)
            {
                result.WithError(new Error(nameof(UpdateVitals), $"Survey with ID {request.SurveyId} not found."));
                return result.WithSuccess(new RequestHandlingComplete(nameof(UpdateVitals), RequestType.Command, result.Reasons));
            }

            existingSurvey.SetVitals(request.Vitals);
            await scopedRepository.Update(existingSurvey, cancellationToken).ConfigureAwait(false);
            await scopedRepository.Save(cancellationToken).ConfigureAwait(false);
            return result.WithSuccess(new RequestHandlingComplete(nameof(UpdateVitals), RequestType.Command, result.Reasons));
        }
    }

    private class RequestValidationBehavior : ICommandRequestBehavior<Request>
    {
        public async Task<Result> Handle(Request request, Func<Task<Result>> next, CancellationToken cancellationToken)
        {
            var validationResult = RequestValidator.Default.Validate(request);
            if(validationResult.IsValid)
            {
                var result = await next().ConfigureAwait(false);
                return result.WithSuccess(new RequestValidationSuccess(nameof(UpdateVitals)));
            }
            return Result.Fail(new RequestValidationError(nameof(UpdateVitals), validationResult.Errors));
        }

        private class RequestValidator : AbstractValidator<Request>
        {
            public static RequestValidator Default { get; } = new();

            public RequestValidator()
            {
                RuleFor(x => x.Vitals).SetVitalsRules();
            }
        }
    }
}
