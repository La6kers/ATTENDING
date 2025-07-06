namespace ClinicalIntake.Application.Chat;

internal static class Constants
{
    public const string CHAT_STAGE_COMPLETED_MARKER = "[FINISH]";

    public static readonly StreamingChatReply DefaultStreamingChatReply =
        new(AsyncEnumerable.Empty<string>(), Task.FromResult(false));
}
