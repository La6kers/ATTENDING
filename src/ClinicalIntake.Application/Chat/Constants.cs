namespace ClinicalIntake.Application.Chat;

internal static class Constants
{
    public static readonly StreamingChatReply DefaultStreamingChatReply =
        new(AsyncEnumerable.Empty<string>(), Task.FromResult(false));
}
