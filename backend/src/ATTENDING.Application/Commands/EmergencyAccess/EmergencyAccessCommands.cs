using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Interfaces;
using MediatR;

namespace ATTENDING.Application.Commands.EmergencyAccess;

// ═══════════════════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

#region Configure Emergency Profile

public record ConfigureEmergencyProfileCommand(
    Guid PatientId,
    bool IsEnabled,
    decimal? GForceThreshold = null,
    int? AutoGrantTimeoutSeconds = null,
    int? AccessWindowMinutes = null
) : IRequest<Result<EmergencyProfileDto>>;

public class ConfigureEmergencyProfileHandler
    : IRequestHandler<ConfigureEmergencyProfileCommand, Result<EmergencyProfileDto>>
{
    private readonly IEmergencyAccessRepository _repository;
    private readonly ICurrentUserService _currentUser;

    public ConfigureEmergencyProfileHandler(
        IEmergencyAccessRepository repository,
        ICurrentUserService currentUser)
    {
        _repository = repository;
        _currentUser = currentUser;
    }

    public async Task<Result<EmergencyProfileDto>> Handle(
        ConfigureEmergencyProfileCommand cmd, CancellationToken ct)
    {
        var patient = await _repository.GetPatientAsync(cmd.PatientId, ct);
        if (patient == null)
            return Result<EmergencyProfileDto>.Failure("Patient not found");

        var profile = await _repository.GetProfileByPatientIdAsync(cmd.PatientId, ct);

        if (profile == null)
        {
            profile = EmergencyAccessProfile.Create(
                _currentUser.TenantId ?? patient.OrganizationId,
                cmd.PatientId);
            await _repository.AddProfileAsync(profile, ct);
        }

        if (cmd.IsEnabled && !profile.IsEnabled)
            profile.Enable();
        else if (!cmd.IsEnabled && profile.IsEnabled)
            profile.Disable();

        profile.UpdateSettings(
            gForceThreshold: cmd.GForceThreshold,
            autoGrantTimeoutSeconds: cmd.AutoGrantTimeoutSeconds,
            accessWindowMinutes: cmd.AccessWindowMinutes);

        profile.MarkReviewed();
        await _repository.SaveChangesAsync(ct);

        return Result<EmergencyProfileDto>.Success(EmergencyProfileDto.From(profile));
    }
}

#endregion

#region Request Emergency Access (First Responder)

public record RequestEmergencyAccessCommand(
    Guid PatientId,
    string TriggerType,
    decimal? PeakGForce,
    string ConsentMethod,
    string ResponderName,
    string BadgeNumber,
    string Agency,
    string? ResponderPhotoUri,
    bool HipaaAcknowledged,
    decimal? Latitude = null,
    decimal? Longitude = null,
    string? DeviceInfo = null
) : IRequest<Result<EmergencyAccessSessionDto>>;

public class RequestEmergencyAccessHandler
    : IRequestHandler<RequestEmergencyAccessCommand, Result<EmergencyAccessSessionDto>>
{
    private readonly IEmergencyAccessRepository _repository;

    public RequestEmergencyAccessHandler(IEmergencyAccessRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<EmergencyAccessSessionDto>> Handle(
        RequestEmergencyAccessCommand cmd, CancellationToken ct)
    {
        var patient = await _repository.GetPatientAsync(cmd.PatientId, ct);
        if (patient == null)
            return Result<EmergencyAccessSessionDto>.Failure("Patient not found");

        var profile = await _repository.GetProfileByPatientIdAsync(cmd.PatientId, ct);
        if (profile == null || !profile.IsEnabled)
            return Result<EmergencyAccessSessionDto>.Failure(
                "Emergency access is not enabled for this patient");

        var accessLog = EmergencyAccessLog.Create(
            organizationId: profile.OrganizationId,
            patientId: cmd.PatientId,
            profileId: profile.Id,
            triggerType: cmd.TriggerType,
            peakGForce: cmd.PeakGForce,
            consentMethod: cmd.ConsentMethod,
            responderName: cmd.ResponderName,
            badgeNumber: cmd.BadgeNumber,
            agency: cmd.Agency,
            responderPhotoUri: cmd.ResponderPhotoUri,
            hipaaAcknowledged: cmd.HipaaAcknowledged,
            accessWindowMinutes: profile.AccessWindowMinutes,
            latitude: cmd.Latitude,
            longitude: cmd.Longitude,
            deviceInfo: cmd.DeviceInfo);

        await _repository.AddAccessLogAsync(accessLog, ct);
        await _repository.SaveChangesAsync(ct);

        return Result<EmergencyAccessSessionDto>.Success(new EmergencyAccessSessionDto(
            SessionId: accessLog.Id,
            PatientId: cmd.PatientId,
            AccessGrantedAt: accessLog.AccessGrantedAt,
            AccessExpiresAt: accessLog.AccessExpiresAt));
    }
}

#endregion

#region Get Emergency Facesheet

public record GetEmergencyFacesheetQuery(
    Guid SessionId
) : IRequest<Result<EmergencyFacesheet>>;

public class GetEmergencyFacesheetHandler
    : IRequestHandler<GetEmergencyFacesheetQuery, Result<EmergencyFacesheet>>
{
    private readonly IEmergencyAccessRepository _repository;
    private readonly IEmergencyFacesheetAssembler _assembler;

    public GetEmergencyFacesheetHandler(
        IEmergencyAccessRepository repository,
        IEmergencyFacesheetAssembler assembler)
    {
        _repository = repository;
        _assembler = assembler;
    }

    public async Task<Result<EmergencyFacesheet>> Handle(
        GetEmergencyFacesheetQuery query, CancellationToken ct)
    {
        var accessLog = await _repository.GetAccessLogAsync(query.SessionId, ct);
        if (accessLog == null)
            return Result<EmergencyFacesheet>.Failure("Access session not found");

        if (!accessLog.IsAccessValid())
            return Result<EmergencyFacesheet>.Failure("Access session has expired");

        var profile = await _repository.GetProfileByPatientIdAsync(accessLog.PatientId, ct);
        if (profile == null || !profile.IsEnabled)
            return Result<EmergencyFacesheet>.Failure("Emergency access has been revoked");

        var facesheet = await _assembler.AssembleAsync(accessLog.PatientId, profile, ct);

        // Record which sections were viewed for audit trail
        var sections = new List<string> { "Demographics" };
        if (profile.ShowDnrStatus) sections.Add("DNR");
        if (profile.ShowAllergies) sections.Add("Allergies");
        if (profile.ShowMedications) sections.Add("Medications");
        if (profile.ShowDiagnoses) sections.Add("Diagnoses");
        if (profile.ShowEmergencyContacts) sections.Add("EmergencyContacts");
        if (profile.ShowImplantedDevices) sections.Add("ImplantedDevices");
        accessLog.RecordSectionsViewed(sections);
        await _repository.SaveChangesAsync(ct);

        return Result<EmergencyFacesheet>.Success(facesheet);
    }
}

#endregion

#region End Emergency Session

public record EndEmergencySessionCommand(Guid SessionId) : IRequest<Result<bool>>;

public class EndEmergencySessionHandler
    : IRequestHandler<EndEmergencySessionCommand, Result<bool>>
{
    private readonly IEmergencyAccessRepository _repository;

    public EndEmergencySessionHandler(IEmergencyAccessRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<bool>> Handle(EndEmergencySessionCommand cmd, CancellationToken ct)
    {
        var accessLog = await _repository.GetAccessLogAsync(cmd.SessionId, ct);
        if (accessLog == null)
            return Result<bool>.Failure("Session not found");

        accessLog.EndSession();
        await _repository.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }
}

#endregion

#region Get Patient Access Logs (Patient reviews who accessed their records)

public record GetEmergencyAccessLogsQuery(
    Guid PatientId,
    int Page = 1,
    int PageSize = 20
) : IRequest<Result<EmergencyAccessLogsResponse>>;

public class GetEmergencyAccessLogsHandler
    : IRequestHandler<GetEmergencyAccessLogsQuery, Result<EmergencyAccessLogsResponse>>
{
    private readonly IEmergencyAccessRepository _repository;

    public GetEmergencyAccessLogsHandler(IEmergencyAccessRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<EmergencyAccessLogsResponse>> Handle(
        GetEmergencyAccessLogsQuery query, CancellationToken ct)
    {
        var (logs, totalCount) = await _repository.GetAccessLogsAsync(
            query.PatientId, query.Page, query.PageSize, ct);
        
        var dtos = logs.Select(EmergencyAccessLogDto.From).ToList();
        return Result<EmergencyAccessLogsResponse>.Success(
            new EmergencyAccessLogsResponse(dtos, totalCount, query.Page, query.PageSize));
    }
}

#endregion

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

public record EmergencyProfileDto(
    Guid Id,
    Guid PatientId,
    bool IsEnabled,
    decimal GForceThreshold,
    int AutoGrantTimeoutSeconds,
    int AccessWindowMinutes,
    DateTime? LastReviewedAt)
{
    public static EmergencyProfileDto From(EmergencyAccessProfile profile) => new(
        profile.Id,
        profile.PatientId,
        profile.IsEnabled,
        profile.GForceThreshold,
        profile.AutoGrantTimeoutSeconds,
        profile.AccessWindowMinutes,
        profile.LastReviewedAt);
}

public record EmergencyAccessSessionDto(
    Guid SessionId,
    Guid PatientId,
    DateTime AccessGrantedAt,
    DateTime AccessExpiresAt);

public record EmergencyAccessLogDto(
    Guid Id,
    string TriggerType,
    decimal? PeakGForce,
    string ConsentMethod,
    string ResponderName,
    string BadgeNumber,
    string Agency,
    bool HipaaAcknowledged,
    DateTime AccessGrantedAt,
    DateTime AccessExpiresAt,
    DateTime? AccessEndedAt,
    string SectionsViewed)
{
    public static EmergencyAccessLogDto From(EmergencyAccessLog log) => new(
        log.Id,
        log.TriggerType,
        log.PeakGForce,
        log.ConsentMethod,
        log.ResponderName,
        log.BadgeNumber,
        log.Agency,
        log.HipaaAcknowledged,
        log.AccessGrantedAt,
        log.AccessExpiresAt,
        log.AccessEndedAt,
        log.SectionsViewed);
}

public record EmergencyAccessLogsResponse(
    IReadOnlyList<EmergencyAccessLogDto> Logs,
    int TotalCount,
    int Page,
    int PageSize);

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES (Application layer)
// ═══════════════════════════════════════════════════════════════════════════════

/// <summary>
/// Assembles a read-only emergency facesheet from patient data.
/// Lives in Application layer; implemented in Infrastructure.
/// </summary>
public interface IEmergencyFacesheetAssembler
{
    Task<EmergencyFacesheet> AssembleAsync(
        Guid patientId,
        EmergencyAccessProfile profile,
        CancellationToken ct);
}
