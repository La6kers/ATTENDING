using FluentResults;
using Microsoft.Extensions.DependencyInjection;
using SharedKernel;
using Error = SharedKernel.Error;
using Success = SharedKernel.Success;

namespace ClinicalIntake.Application.Chat.Features.Events;

//TODO: make ChatSurveyCompleted an event
public static class ChatSurveyCompleted
{
    public record Request(ChatSurvey ChatSurvey) : ICommandRequest;

    internal static IServiceCollection AddChatSurveyCompletedEvent(this IServiceCollection services)
        => services.AddScoped<ICommandRequestHandler<Request>, Handler>(provider =>
        {
            var eventBus = provider.GetKeyedService<IEventBus>(nameof(ChatSurveyCompleted));
            ArgumentNullException.ThrowIfNull(eventBus, nameof(eventBus));
            return new(eventBus);
        });

    private class Handler(IEventBus eventBus) : ICommandRequestHandler<Request>
    {
        private readonly IEventBus _eventBus = eventBus;
        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                ArgumentNullException.ThrowIfNull(request.ChatSurvey, nameof(request.ChatSurvey));
                await _eventBus.Trigger(request.ChatSurvey).ConfigureAwait(false);
                return Result.Ok()
                    .WithSuccess(new Success(nameof(ChatSurveyCompleted), "Event Chat Survey Completed triggered successfully."));
            }
            catch(Exception exception)
            {
                return Result.Fail(new SharedKernel.ExceptionalError(nameof(ChatSurveyCompleted), exception))
                    .WithError(new Error(nameof(ChatSurvey), "An error occurred while triggering event Chat Survey Completed."));
            }
        }
    }

    public interface IEventBus
    {
        Task Trigger(ChatSurvey ChatSurvey);
    }
}