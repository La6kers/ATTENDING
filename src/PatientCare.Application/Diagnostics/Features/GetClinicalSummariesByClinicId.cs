using FluentResults;
using Microsoft.Extensions.DependencyInjection;
using SharedKernel;
using System.Linq.Expressions;
using ExceptionalError = SharedKernel.ExceptionalError;

namespace PatientCare.Application.Diagnostics.Features;

public static class GetClinicalSummariesByClinicId
{
    public static IServiceCollection AddGetClinicalSummariesByClinicIdHandler(this IServiceCollection services)
    {
        return services.AddScoped<IRequestHandler<Request, Response>, Handler>();
    }

    public record Request(int ClinicId) : IRequest<Response>;
    public record Response(int ClinicId, IEnumerable<ClinicalSummary> ClinicalSummaries);

    internal static IServiceCollection AddGetClinicalSummariesByClinicIdFeature(this IServiceCollection services)
    {
        return services.AddScoped<IRequestHandler<Request, Response>, Handler>();
    }

    internal class Handler(IReadRepository<ClinicalSummary> repository) : IRequestHandler<Request, Response>
    {
        public async Task<Result<Response>> Handle(Request request, CancellationToken cancellationToken)
        {
            ArgumentNullException.ThrowIfNull(request);

            try
            {
                Expression<Func<ClinicalSummary, bool>> specification = cs => cs.ClinicId == request.ClinicId;
                var clinicalSummaries = await repository.GetAllWhere(specification, cancellationToken) ?? [];
                var response = new Response(request.ClinicId, clinicalSummaries);
                return Result.Ok(response);
            }
            catch(Exception exception)
            {
                return Result.Fail<Response>(new ExceptionalError(nameof(GetClinicalSummariesByClinicId), exception));
            }
        }
    }
}
