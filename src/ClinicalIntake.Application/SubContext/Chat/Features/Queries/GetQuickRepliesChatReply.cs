using FluentResults;
using Microsoft.Extensions.DependencyInjection;
using SharedKernel;
using Error = SharedKernel.Error;
using ExceptionalError = SharedKernel.ExceptionalError;

namespace ClinicalIntake.Application.SubContext.Chat.Features.Queries;
public static class GetQuickRepliesChatReply
{
    public record Request(IEnumerable<ChatMessage> Messages) : IRequest<Response>;
    public record Response(IEnumerable<string> QuickReplies);
    internal static IServiceCollection AddGetQuickRepliesChatReplyFeature(this IServiceCollection services)
        => services.AddScoped<IRequestHandler<Request, Response>, Handler>();

    private class Handler(IChatService chatService) : IRequestHandler<Request, Response>
    {
        private readonly IChatService _chatService = chatService;
        public async Task<Result<Response>> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                if(request.Messages == null || !request.Messages.Any())
                    return Result.Fail<Response>(new Error(nameof(GetQuickRepliesChatReply), "Messages cannot be empty."));
                var quickReplies = await _chatService.GetQuickReplies(request.Messages, cancellationToken);

                var response = new Response(quickReplies);
                return Result.Ok(response);
            }
            catch(Exception exception)
            {
                return Result.Fail<Response>(new ExceptionalError(nameof(GetQuickRepliesChatReply), exception))
                    .WithError("An error occurred while getting quick replies.");
            }
        }
    }
    internal interface IChatService
    {
        Task<IEnumerable<string>> GetQuickReplies(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken);
    }
}