namespace ClinicalIntake.Application.Chat;

public class ChatSurvey(int clinicId) : ISurvey
{
    public int ClinicId { get; private set; } = clinicId;
    public string MedicalRecordNumber { get; init; } = string.Empty;
    public string Summary { get; init; } = string.Empty;
    public List<ChatMessage> Messages { get; private set; } = [];
}

public record ChatMessage(ChatRole Role)
{
    public ChatRole Role { get; private set; } = Role;
    public string Text { get; set; } = string.Empty;

    public ChatMessage() : this(ChatRole.Undefined) { }
}

public class Image(ImageMimeType mimeType, BinaryData data)
{
    public ImageMimeType MimeType { get; init; } = mimeType;
    public BinaryData Data { get; init; } = data;
}

public interface ISurvey
{
    int ClinicId { get; }
    string MedicalRecordNumber { get; }
    string Summary { get; }
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
    Undefined = 1,
    System,
    User,               // TODO: the domain model should be patient
    Assistant
}

public enum ImageMimeType
{
    Jpeg = 1,
    Png,
    Gif,
    Bmp,
    Tiff
}