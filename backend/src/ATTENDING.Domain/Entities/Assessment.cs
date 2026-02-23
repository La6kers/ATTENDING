using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;
using ATTENDING.Domain.Services;

namespace ATTENDING.Domain.Entities;

/// <summary>
/// Patient Assessment (COMPASS flow) entity
/// </summary>
public class PatientAssessment : BaseEntity, IAggregateRoot
{
    public Guid Id { get; private set; }
    public string AssessmentNumber { get; private set; } = string.Empty;
    
    // Relationships
    public Guid PatientId { get; private set; }
    public Guid? EncounterId { get; private set; }
    public Guid? ReviewedByProviderId { get; private set; }
    
    // Assessment Data
    public string ChiefComplaint { get; private set; } = string.Empty;
    public AssessmentPhase CurrentPhase { get; private set; }
    public TriageLevel? TriageLevel { get; private set; }
    public int? PainSeverity { get; private set; }
    
    // OLDCARTS HPI
    public string? HpiOnset { get; private set; }
    public string? HpiLocation { get; private set; }
    public string? HpiDuration { get; private set; }
    public string? HpiCharacter { get; private set; }
    public string? HpiAggravating { get; private set; }
    public string? HpiRelieving { get; private set; }
    public string? HpiTiming { get; private set; }
    public string? HpiSeverity { get; private set; }
    public string? HpiContext { get; private set; }
    public string? HpiAssociatedSymptoms { get; private set; }
    
    // Review of Systems
    public string? ReviewOfSystemsJson { get; private set; }
    
    // History
    public string? MedicalHistoryJson { get; private set; }
    public string? MedicationsJson { get; private set; }
    public string? AllergiesJson { get; private set; }
    public string? SocialHistoryJson { get; private set; }
    
    // Risk Assessment
    public bool HasRedFlags { get; private set; }
    public string? RedFlagsJson { get; private set; }
    public string? RiskFactorsJson { get; private set; }
    
    // AI Analysis
    public string? DifferentialDiagnosisJson { get; private set; }
    public string? RecommendedWorkupJson { get; private set; }
    
    // Media
    public string? VoiceTranscript { get; private set; }
    public string? ImageUrlsJson { get; private set; }
    
    // Status
    public DateTime StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public DateTime? ReviewedAt { get; private set; }
    public bool IsEmergency { get; private set; }
    public string? EmergencyReason { get; private set; }
    
    // Navigation
    public virtual Patient? Patient { get; private set; }
    public virtual Encounter? Encounter { get; private set; }
    public virtual User? ReviewedByProvider { get; private set; }
    public virtual ICollection<AssessmentSymptom> Symptoms { get; private set; } = new List<AssessmentSymptom>();
    public virtual ICollection<AssessmentResponse> Responses { get; private set; } = new List<AssessmentResponse>();
    
    private readonly List<DomainEvent> _domainEvents = new();
    public IReadOnlyCollection<DomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    
    private PatientAssessment() { }
    
    public static PatientAssessment Create(
        Guid patientId,
        string chiefComplaint,
        RedFlagEvaluation? redFlagEvaluation = null)
    {
        var assessment = new PatientAssessment
        {
            Id = Guid.NewGuid(),
            AssessmentNumber = $"ASM-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}",
            PatientId = patientId,
            ChiefComplaint = chiefComplaint,
            CurrentPhase = AssessmentPhase.ChiefComplaint,
            StartedAt = DateTime.UtcNow
        };
        
        assessment._domainEvents.Add(new AssessmentStartedEvent(assessment.Id, patientId));
        
        // Apply red flags if detected from chief complaint
        if (redFlagEvaluation?.HasRedFlags == true)
        {
            assessment.SetRedFlags(redFlagEvaluation.RedFlags);
            if (redFlagEvaluation.IsEmergency)
            {
                assessment.TriggerEmergency(redFlagEvaluation.Reason);
            }
        }
        
        return assessment;
    }
    
    public void AdvancePhase(AssessmentPhase newPhase)
    {
        CurrentPhase = newPhase;
        SetModified();
    }
    
    /// <summary>
    /// Alias for AdvancePhase — used by controller
    /// </summary>
    public void AdvanceToPhase(AssessmentPhase newPhase) => AdvancePhase(newPhase);
    
    public void SetHpiData(
        string? onset = null,
        string? location = null,
        string? duration = null,
        string? character = null,
        string? aggravating = null,
        string? relieving = null,
        string? timing = null,
        string? severity = null,
        string? context = null,
        string? associatedSymptoms = null)
    {
        if (onset != null) HpiOnset = onset;
        if (location != null) HpiLocation = location;
        if (duration != null) HpiDuration = duration;
        if (character != null) HpiCharacter = character;
        if (aggravating != null) HpiAggravating = aggravating;
        if (relieving != null) HpiRelieving = relieving;
        if (timing != null) HpiTiming = timing;
        if (severity != null) HpiSeverity = severity;
        if (context != null) HpiContext = context;
        if (associatedSymptoms != null) HpiAssociatedSymptoms = associatedSymptoms;
        SetModified();
    }
    
    public void SetPainSeverity(int severity)
    {
        if (severity < 0 || severity > 10)
            throw new ArgumentException("Pain severity must be 0-10");
        PainSeverity = severity;
        SetModified();
    }
    
    public void SetRedFlags(IEnumerable<DetectedRedFlag> flags)
    {
        HasRedFlags = flags.Any();
        RedFlagsJson = System.Text.Json.JsonSerializer.Serialize(flags);
        
        foreach (var flag in flags.Where(f => f.Severity == RedFlagSeverity.Critical))
        {
            _domainEvents.Add(new RedFlagDetectedEvent(
                Id, PatientId, flag.Category, flag.Severity, flag.ClinicalReason));
        }
        
        SetModified();
    }
    
    public void TriggerEmergency(string reason)
    {
        IsEmergency = true;
        EmergencyReason = reason;
        CurrentPhase = AssessmentPhase.Emergency;
        SetModified();
        
        _domainEvents.Add(new EmergencyProtocolTriggeredEvent(
            Id, PatientId, reason, "Call 911 immediately"));
    }
    
    public void SetTriageLevel(TriageLevel level)
    {
        TriageLevel = level;
        SetModified();
    }
    
    public void Complete(TriageLevel? triageLevel = null, string? summary = null)
    {
        if (triageLevel.HasValue)
        {
            TriageLevel = triageLevel.Value;
        }
        CurrentPhase = AssessmentPhase.Completed;
        CompletedAt = DateTime.UtcNow;
        SetModified();
        
        _domainEvents.Add(new AssessmentCompletedEvent(
            Id, PatientId, TriageLevel ?? Enums.TriageLevel.NonUrgent, HasRedFlags));
    }
    
    public void MarkAsReviewed(Guid providerId, string? notes = null)
    {
        ReviewedByProviderId = providerId;
        ReviewedAt = DateTime.UtcNow;
        SetModified();
    }
    
    /// <summary>
    /// Add a patient response and re-evaluate for red flags
    /// </summary>
    public void AddResponse(string question, string response, RedFlagEvaluation? redFlagEvaluation = null)
    {
        var assessmentResponse = AssessmentResponse.Create(
            Id, CurrentPhase, question, response);
        Responses.Add(assessmentResponse);
        
        if (redFlagEvaluation?.HasRedFlags == true)
        {
            SetRedFlags(redFlagEvaluation.RedFlags);
            if (redFlagEvaluation.IsEmergency && !IsEmergency)
            {
                TriggerEmergency(redFlagEvaluation.Reason);
            }
        }
        
        SetModified();
    }
    
    public void LinkToEncounter(Guid encounterId)
    {
        EncounterId = encounterId;
        SetModified();
    }
    
    public void ClearDomainEvents() => _domainEvents.Clear();
}

/// <summary>
/// Assessment symptom
/// </summary>
public class AssessmentSymptom : BaseEntity
{
    public Guid Id { get; private set; }
    public Guid AssessmentId { get; private set; }
    public string SymptomCode { get; private set; } = string.Empty;
    public string SymptomName { get; private set; } = string.Empty;
    public string? BodySystem { get; private set; }
    public string? Severity { get; private set; }
    public string? Duration { get; private set; }
    public bool IsPresent { get; private set; }
    public string? AdditionalNotes { get; private set; }
    
    public virtual PatientAssessment? Assessment { get; private set; }
    
    private AssessmentSymptom() { }
    
    public static AssessmentSymptom Create(
        Guid assessmentId,
        string symptomCode,
        string symptomName,
        bool isPresent,
        string? bodySystem = null,
        string? severity = null,
        string? duration = null,
        string? additionalNotes = null)
    {
        return new AssessmentSymptom
        {
            Id = Guid.NewGuid(),
            AssessmentId = assessmentId,
            SymptomCode = symptomCode,
            SymptomName = symptomName,
            IsPresent = isPresent,
            BodySystem = bodySystem,
            Severity = severity,
            Duration = duration,
            AdditionalNotes = additionalNotes
        };
    }
}

/// <summary>
/// Assessment response (for tracking conversation flow)
/// </summary>
public class AssessmentResponse : BaseEntity
{
    public Guid Id { get; private set; }
    public Guid AssessmentId { get; private set; }
    public AssessmentPhase Phase { get; private set; }
    public string Question { get; private set; } = string.Empty;
    public string Response { get; private set; } = string.Empty;
    public string? ExtractedEntities { get; private set; }
    public DateTime RespondedAt { get; private set; }
    
    public virtual PatientAssessment? Assessment { get; private set; }
    
    private AssessmentResponse() { }
    
    public static AssessmentResponse Create(
        Guid assessmentId,
        AssessmentPhase phase,
        string question,
        string response,
        string? extractedEntities = null)
    {
        return new AssessmentResponse
        {
            Id = Guid.NewGuid(),
            AssessmentId = assessmentId,
            Phase = phase,
            Question = question,
            Response = response,
            ExtractedEntities = extractedEntities,
            RespondedAt = DateTime.UtcNow
        };
    }
}

/// <summary>
/// Audit Log for HIPAA compliance
/// </summary>
public class AuditLog : BaseEntity
{
    public long Id { get; private set; }
    public DateTime Timestamp { get; private set; }
    public Guid UserId { get; private set; }
    public string UserEmail { get; private set; } = string.Empty;
    public string UserRole { get; private set; } = string.Empty;
    public string Action { get; private set; } = string.Empty;
    public string EntityType { get; private set; } = string.Empty;
    public string EntityId { get; private set; } = string.Empty;
    public Guid? PatientId { get; private set; }
    public string? IpAddress { get; private set; }
    public string? UserAgent { get; private set; }
    public string? RequestPath { get; private set; }
    public string? RequestMethod { get; private set; }
    public int? StatusCode { get; private set; }
    public string? Details { get; private set; } // JSON
    public string? OldValues { get; private set; } // JSON
    public string? NewValues { get; private set; } // JSON
    
    private AuditLog() { }
    
    public static AuditLog Create(
        Guid userId,
        string userEmail,
        string userRole,
        string action,
        string entityType,
        string entityId,
        Guid? patientId = null,
        string? ipAddress = null,
        string? userAgent = null,
        string? requestPath = null,
        string? requestMethod = null,
        int? statusCode = null,
        string? details = null,
        string? oldValues = null,
        string? newValues = null)
    {
        return new AuditLog
        {
            Timestamp = DateTime.UtcNow,
            UserId = userId,
            UserEmail = userEmail,
            UserRole = userRole,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            PatientId = patientId,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            RequestPath = requestPath,
            RequestMethod = requestMethod,
            StatusCode = statusCode,
            Details = details,
            OldValues = oldValues,
            NewValues = newValues
        };
    }
}
