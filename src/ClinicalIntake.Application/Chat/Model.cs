using System.Text.Json.Serialization;

namespace ClinicalIntake.Application.Chat;

public class ChatSurvey(int clinicId) : ISurvey
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public int ClinicId { get; private set; } = clinicId;
    public string MedicalRecordNumber { get; init; } = string.Empty;
    public string Summary { get; init; } = string.Empty;
    public List<ChatMessage> Messages { get; private set; } = [];
    public string? PhoneNumber { get; set; } = string.Empty;
    public DateTimeOffset? AppointmentTime { get; set; } = null;
    public string ProviderName { get; set; } = string.Empty;
}

public record ChatMessage(ChatRole Role)
{
    public ChatRole Role { get; init; } = Role;
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
    Guid Id { get; }
    int ClinicId { get; }
    string MedicalRecordNumber { get; }
    string Summary { get; }
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ChatStage
{
    ChiefComplaint = 1,
    Symptoms,
    MedicalHistory,
    CurrentMedications,
    Complete,
    ClinicalSummary
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ChatRole
{
    Undefined = 1,
    System,
    User,               // TODO: the domain model should be patient
    Assistant
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ImageMimeType
{
    Jpeg = 1,
    Png,
    Gif,
    Bmp,
    Tiff
}