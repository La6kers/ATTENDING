namespace ClinicalIntake.Application.Chat;
public record ChatMessage(ChatRole role, string content)
{
    public ChatRole Role { get; init; } = role;
    public string Content { get; set; } = content;
}

public enum ChatStage
{
    ChiefComplaint = 1,
    //SymptomAnalysis,
    MedicalHistory,
    CurrentMedications,
    ClinicalSummary,
}

public enum ChatRole
{
    System = 1,
    User,
    Assistant
}
