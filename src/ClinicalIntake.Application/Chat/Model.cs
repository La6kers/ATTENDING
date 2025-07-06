namespace ClinicalIntake.Application.Chat;
public record ChatMessage(ChatRole Role, string Content);
public record StreamingChatReply(IAsyncEnumerable<string> Stream, Task<bool> IsChatStageComplete);

public enum ChatStage
{
    ChiefComplaint = 1,
    SymptomAnalysis,
    MedicalHistory,
    CurrentMedications,
}

public enum ChatRole
{
    System = 1,
    User,
    Assistant
}
