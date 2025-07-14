namespace ClinicalIntake.Application.Chat;

public record ChatMessage
{
    public ChatMessage(ChatRole role, string content)
    {
        Role = role;
        Content = content;
    }
    public ChatRole Role { get; init; }
    public string Content { get; set; }
}

public enum ChatStage
{
    ChiefComplaint = 1,
    Symptoms,
    MedicalHistory,
    CurrentMedications,
    Complete,
    ClinicalSummary
}

public enum ChatRole
{
    System = 1,
    User,               // TODO: the model should be patient
    Assistant
}