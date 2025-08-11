using FluentResults;
using Microsoft.Extensions.DependencyInjection;
using SharedKernel;
using Error = SharedKernel.Error;
using Success = SharedKernel.Success;

namespace ClinicalIntake.Application.Chat.Events;

//TODO: make this an event
public static class SaveChatSurvey
{
    public record Request(ChatSurvey ChatSurvey) : ICommandRequest;

    internal static IServiceCollection AddSaveChatSurvey(this IServiceCollection services)
        => services.AddScoped<ICommandRequestHandler<Request>, Handler>();

    private class Handler(IRepository<ChatSurvey> chatSurveyRepository) : ICommandRequestHandler<Request>
    {
        private readonly IRepository<ChatSurvey> _chatSurveyRepository = chatSurveyRepository;
        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                //TODO: check if the chat survey already exists
                ArgumentNullException.ThrowIfNull(request.ChatSurvey, nameof(request.ChatSurvey));
                await _chatSurveyRepository.Add(request.ChatSurvey, cancellationToken);
                await _chatSurveyRepository.Save(cancellationToken);
                return Result.Ok()
                    .WithSuccess(new Success(nameof(SaveChatSurvey), "Chat survey saved successfully."));
            }
            catch(Exception exception)
            {
                return Result.Fail(new SharedKernel.ExceptionalError(nameof(SaveChatSurvey), exception))
                    .WithError(new Error(nameof(ChatSurvey), "An error occurred while saving the chat survey."));
            }
        }
    }
}