namespace ClinicalIntake.Application;
public record ChatMessage(ChatRole Role, string Content);
public enum ChatRole
{
    System = 1,
    User,
    Assistant
}
