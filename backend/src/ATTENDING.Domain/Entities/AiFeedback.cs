using ATTENDING.Domain.Entities;

namespace ATTENDING.Domain.Entities;

/// <summary>
/// AI recommendation feedback from providers â€” tracks accuracy and usefulness
/// of AI-generated clinical recommendations. No PHI stored.
/// </summary>
public class AiFeedback : BaseEntity
{
    public Guid Id { get; private set; }
    public Guid ProviderId { get; private set; }
    public Guid? PatientId { get; private set; }
    public Guid? EncounterId { get; private set; }

    /// <summary>
    /// Type of AI recommendation: Differential, LabRecommendation, ImagingRecommendation,
    /// TreatmentRecommendation, Triage, SOAPNote, AmbientScribe
    /// </summary>
    public string RecommendationType { get; private set; } = string.Empty;

    /// <summary>
    /// Unique ID of the AI request that generated the recommendation
    /// </summary>
    public string RequestId { get; private set; } = string.Empty;

    /// <summary>
    /// Provider rating: Helpful, NotHelpful, PartiallyHelpful
    /// </summary>
    public string Rating { get; private set; } = string.Empty;

    /// <summary>
    /// 1-5 accuracy score (optional)
    /// </summary>
    public int? AccuracyScore { get; private set; }

    /// <summary>
    /// Provider's selected/confirmed diagnosis (for differential feedback)
    /// </summary>
    public string? SelectedDiagnosis { get; private set; }

    /// <summary>
    /// Free-text comment from provider (max 500 chars, no PHI)
    /// </summary>
    public string? Comment { get; private set; }

    /// <summary>
    /// AI model version that generated the recommendation
    /// </summary>
    public string? ModelVersion { get; private set; }

    private AiFeedback() { }

    public static AiFeedback Create(
        Guid providerId,
        string recommendationType,
        string requestId,
        string rating,
        int? accuracyScore = null,
        string? selectedDiagnosis = null,
        string? comment = null,
        string? modelVersion = null,
        Guid? patientId = null,
        Guid? encounterId = null)
    {
        if (comment?.Length > 500) comment = comment[..500];

        return new AiFeedback
        {
            Id = Guid.NewGuid(),
            ProviderId = providerId,
            RecommendationType = recommendationType,
            RequestId = requestId,
            Rating = rating,
            AccuracyScore = accuracyScore,
            SelectedDiagnosis = selectedDiagnosis,
            Comment = comment,
            ModelVersion = modelVersion,
            PatientId = patientId,
            EncounterId = encounterId
        };
    }
}
