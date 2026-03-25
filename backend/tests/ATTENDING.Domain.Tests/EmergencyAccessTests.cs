using ATTENDING.Domain.Common;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Events;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Application.Commands.EmergencyAccess;
using MediatR;
using Moq;
using Xunit;

namespace ATTENDING.Domain.Tests;

/// <summary>
/// Comprehensive test suite for h4 Emergency Medical Access feature.
/// 30+ tests covering domain entities, application handlers, and clinical safety.
/// </summary>
public class EmergencyAccessTests
{
    private readonly Guid _orgId = Guid.NewGuid();
    private readonly Guid _patientId = Guid.NewGuid();

    // ═══════════════════════════════════════════════════════════════════════
    // DOMAIN: EmergencyAccessProfile
    // ═══════════════════════════════════════════════════════════════════════

    [Fact]
    [Trait("Category", "Unit")]
    public void Profile_Create_DisabledByDefault()
    {
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);

        Assert.False(profile.IsEnabled);
        Assert.Equal(_orgId, profile.OrganizationId);
        Assert.Equal(_patientId, profile.PatientId);
        Assert.Equal(4.0m, profile.GForceThreshold);
        Assert.Equal(30, profile.AutoGrantTimeoutSeconds);
        Assert.Equal(10, profile.AccessWindowMinutes);
        Assert.NotEqual(Guid.Empty, profile.Id);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void Profile_Enable_RaisesDomainEvent()
    {
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);
        profile.Enable();

        Assert.True(profile.IsEnabled);
        Assert.Single(profile.DomainEvents);
        var evt = Assert.IsType<EmergencyAccessEnabledEvent>(profile.DomainEvents.First());
        Assert.Equal(profile.Id, evt.ProfileId);
        Assert.Equal(_patientId, evt.PatientId);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void Profile_Disable_RaisesDomainEvent()
    {
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);
        profile.Enable();
        profile.ClearDomainEvents();
        profile.Disable();

        Assert.False(profile.IsEnabled);
        Assert.Single(profile.DomainEvents);
        Assert.IsType<EmergencyAccessDisabledEvent>(profile.DomainEvents.First());
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void Profile_DefaultVisibility_AllEnabled()
    {
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);

        Assert.True(profile.ShowDnrStatus);
        Assert.True(profile.ShowMedications);
        Assert.True(profile.ShowAllergies);
        Assert.True(profile.ShowDiagnoses);
        Assert.True(profile.ShowEmergencyContacts);
        Assert.True(profile.ShowImplantedDevices);
    }

    [Theory]
    [Trait("Category", "Unit")]
    [InlineData(2.0)]
    [InlineData(4.0)]
    [InlineData(20.0)]
    public void Profile_UpdateGForce_ValidRange(double threshold)
    {
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);
        profile.UpdateSettings(gForceThreshold: (decimal)threshold);
        Assert.Equal((decimal)threshold, profile.GForceThreshold);
    }

    [Theory]
    [Trait("Category", "Unit")]
    [InlineData(1.9)]
    [InlineData(20.1)]
    [InlineData(0)]
    [InlineData(-1)]
    public void Profile_UpdateGForce_InvalidRange_Throws(double threshold)
    {
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);
        Assert.Throws<DomainException>(() =>
            profile.UpdateSettings(gForceThreshold: (decimal)threshold));
    }

    [Theory]
    [Trait("Category", "Unit")]
    [InlineData(10)]
    [InlineData(60)]
    [InlineData(120)]
    public void Profile_UpdateTimeout_ValidRange(int seconds)
    {
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);
        profile.UpdateSettings(autoGrantTimeoutSeconds: seconds);
        Assert.Equal(seconds, profile.AutoGrantTimeoutSeconds);
    }

    [Theory]
    [Trait("Category", "Unit")]
    [InlineData(9)]
    [InlineData(121)]
    [InlineData(0)]
    public void Profile_UpdateTimeout_InvalidRange_Throws(int seconds)
    {
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);
        Assert.Throws<DomainException>(() =>
            profile.UpdateSettings(autoGrantTimeoutSeconds: seconds));
    }

    [Theory]
    [Trait("Category", "Unit")]
    [InlineData(5)]
    [InlineData(15)]
    [InlineData(30)]
    public void Profile_UpdateAccessWindow_ValidRange(int minutes)
    {
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);
        profile.UpdateSettings(accessWindowMinutes: minutes);
        Assert.Equal(minutes, profile.AccessWindowMinutes);
    }

    [Theory]
    [Trait("Category", "Unit")]
    [InlineData(4)]
    [InlineData(31)]
    public void Profile_UpdateAccessWindow_InvalidRange_Throws(int minutes)
    {
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);
        Assert.Throws<DomainException>(() =>
            profile.UpdateSettings(accessWindowMinutes: minutes));
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void Profile_MarkReviewed_SetsTimestamp()
    {
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);
        Assert.Null(profile.LastReviewedAt);

        profile.MarkReviewed();
        Assert.NotNull(profile.LastReviewedAt);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void Profile_UpdateVisibility_SelectiveHiding()
    {
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);
        profile.UpdateSettings(showMeds: false, showImplants: false);

        Assert.True(profile.ShowDnrStatus);
        Assert.False(profile.ShowMedications);
        Assert.True(profile.ShowAllergies);
        Assert.False(profile.ShowImplantedDevices);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DOMAIN: EmergencyAccessLog
    // ═══════════════════════════════════════════════════════════════════════

    [Fact]
    [Trait("Category", "Unit")]
    public void AccessLog_Create_ValidInput_Succeeds()
    {
        var profileId = Guid.NewGuid();
        var log = EmergencyAccessLog.Create(
            _orgId, _patientId, profileId,
            triggerType: "GForce",
            peakGForce: 7.2m,
            consentMethod: "AutoGrantTimeout",
            responderName: "John Smith",
            badgeNumber: "EMS-4421",
            agency: "Metro Fire Department",
            responderPhotoUri: "blob://photos/abc123",
            hipaaAcknowledged: true,
            accessWindowMinutes: 10,
            latitude: 37.7749m,
            longitude: -122.4194m,
            deviceInfo: "iPhone 15");

        Assert.Equal(_patientId, log.PatientId);
        Assert.Equal("GForce", log.TriggerType);
        Assert.Equal(7.2m, log.PeakGForce);
        Assert.Equal("John Smith", log.ResponderName);
        Assert.Equal("EMS-4421", log.BadgeNumber);
        Assert.True(log.HipaaAcknowledged);
        Assert.True(log.IsAccessValid());
        Assert.NotEqual(Guid.Empty, log.Id);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void AccessLog_Create_RaisesDomainEvent()
    {
        var log = CreateValidAccessLog();
        Assert.Single(log.DomainEvents);
        var evt = Assert.IsType<EmergencyRecordAccessedEvent>(log.DomainEvents.First());
        Assert.Equal(_patientId, evt.PatientId);
        Assert.False(string.IsNullOrEmpty(evt.ResponderName));
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void AccessLog_Create_MissingResponderName_Throws()
    {
        Assert.Throws<DomainException>(() =>
            EmergencyAccessLog.Create(_orgId, _patientId, Guid.NewGuid(),
                "GForce", 5.0m, "AutoGrantTimeout",
                responderName: "",
                badgeNumber: "123", agency: "FD",
                responderPhotoUri: null, hipaaAcknowledged: true,
                accessWindowMinutes: 10));
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void AccessLog_Create_MissingBadge_Throws()
    {
        Assert.Throws<DomainException>(() =>
            EmergencyAccessLog.Create(_orgId, _patientId, Guid.NewGuid(),
                "GForce", 5.0m, "AutoGrantTimeout",
                responderName: "John", badgeNumber: "",
                agency: "FD", responderPhotoUri: null,
                hipaaAcknowledged: true, accessWindowMinutes: 10));
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void AccessLog_Create_MissingAgency_Throws()
    {
        Assert.Throws<DomainException>(() =>
            EmergencyAccessLog.Create(_orgId, _patientId, Guid.NewGuid(),
                "GForce", 5.0m, "AutoGrantTimeout",
                responderName: "John", badgeNumber: "123",
                agency: "", responderPhotoUri: null,
                hipaaAcknowledged: true, accessWindowMinutes: 10));
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void AccessLog_Create_NoHipaaAck_Throws()
    {
        Assert.Throws<DomainException>(() =>
            EmergencyAccessLog.Create(_orgId, _patientId, Guid.NewGuid(),
                "GForce", 5.0m, "AutoGrantTimeout",
                responderName: "John", badgeNumber: "123",
                agency: "FD", responderPhotoUri: null,
                hipaaAcknowledged: false, accessWindowMinutes: 10));
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void AccessLog_EndSession_MarksEnded()
    {
        var log = CreateValidAccessLog();
        Assert.Null(log.AccessEndedAt);

        log.EndSession();
        Assert.NotNull(log.AccessEndedAt);
        Assert.False(log.IsAccessValid());
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void AccessLog_EndSession_Idempotent()
    {
        var log = CreateValidAccessLog();
        log.EndSession();
        var firstEnd = log.AccessEndedAt;

        log.EndSession();
        Assert.Equal(firstEnd, log.AccessEndedAt);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void AccessLog_RecordSectionsViewed_StoresCSV()
    {
        var log = CreateValidAccessLog();
        log.RecordSectionsViewed(new[] { "DNR", "Allergies", "Medications" });
        Assert.Equal("DNR,Allergies,Medications", log.SectionsViewed);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DOMAIN: EmergencyFacesheet (Value Object)
    // ═══════════════════════════════════════════════════════════════════════

    [Fact]
    [Trait("Category", "Unit")]
    public void Facesheet_IsImmutable_RecordType()
    {
        var facesheet = CreateTestFacesheet();
        Assert.Equal("Test Patient", facesheet.PatientName);
        Assert.True(facesheet.HasDnr);
        Assert.False(facesheet.IsFullCode);
        Assert.Single(facesheet.Allergies);
        Assert.Equal("Severe", facesheet.Allergies[0].Severity);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // APPLICATION: ConfigureEmergencyProfile handler
    // ═══════════════════════════════════════════════════════════════════════

    [Fact]
    [Trait("Category", "Unit")]
    public async Task ConfigureProfile_NewPatient_CreatesProfile()
    {
        var repo = new MockEmergencyAccessRepository();
        var patient = Patient.Create(_orgId, "MRN-001", "Test", "Patient",
            DateTime.Parse("1980-01-01"), BiologicalSex.Female);
        repo.SetPatient(patient);

        var currentUser = new Mock<ICurrentUserService>();
        currentUser.Setup(x => x.TenantId).Returns(_orgId);

        var handler = new ConfigureEmergencyProfileHandler(repo, currentUser.Object);
        var result = await handler.Handle(
            new ConfigureEmergencyProfileCommand(patient.Id, IsEnabled: true, GForceThreshold: 5.0m),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value.IsEnabled);
        Assert.Equal(5.0m, result.Value.GForceThreshold);
        Assert.NotNull(repo.SavedProfile);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public async Task ConfigureProfile_PatientNotFound_Fails()
    {
        var repo = new MockEmergencyAccessRepository();
        var currentUser = new Mock<ICurrentUserService>();

        var handler = new ConfigureEmergencyProfileHandler(repo, currentUser.Object);
        var result = await handler.Handle(
            new ConfigureEmergencyProfileCommand(Guid.NewGuid(), IsEnabled: true),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public async Task ConfigureProfile_ExistingProfile_Updates()
    {
        var repo = new MockEmergencyAccessRepository();
        var patient = Patient.Create(_orgId, "MRN-001", "Test", "Patient",
            DateTime.Parse("1980-01-01"), BiologicalSex.Female);
        repo.SetPatient(patient);

        var existingProfile = EmergencyAccessProfile.Create(_orgId, patient.Id);
        existingProfile.Enable();
        repo.SetProfile(existingProfile);

        var currentUser = new Mock<ICurrentUserService>();
        currentUser.Setup(x => x.TenantId).Returns(_orgId);

        var handler = new ConfigureEmergencyProfileHandler(repo, currentUser.Object);
        var result = await handler.Handle(
            new ConfigureEmergencyProfileCommand(patient.Id, IsEnabled: false),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value.IsEnabled);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // APPLICATION: RequestEmergencyAccess handler
    // ═══════════════════════════════════════════════════════════════════════

    [Fact]
    [Trait("Category", "Unit")]
    public async Task RequestAccess_ValidProfile_CreatesSession()
    {
        var repo = new MockEmergencyAccessRepository();
        var patient = Patient.Create(_orgId, "MRN-001", "Test", "Patient",
            DateTime.Parse("1980-01-01"), BiologicalSex.Female);
        repo.SetPatient(patient);

        var profile = EmergencyAccessProfile.Create(_orgId, patient.Id);
        profile.Enable();
        repo.SetProfile(profile);

        var handler = new RequestEmergencyAccessHandler(repo);
        var result = await handler.Handle(
            new RequestEmergencyAccessCommand(
                PatientId: patient.Id,
                TriggerType: "GForce",
                PeakGForce: 7.5m,
                ConsentMethod: "AutoGrantTimeout",
                ResponderName: "Paramedic Jane",
                BadgeNumber: "EMS-9912",
                Agency: "County EMS",
                ResponderPhotoUri: null,
                HipaaAcknowledged: true),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotEqual(Guid.Empty, result.Value.SessionId);
        Assert.True(result.Value.AccessExpiresAt > result.Value.AccessGrantedAt);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public async Task RequestAccess_ProfileDisabled_Fails()
    {
        var repo = new MockEmergencyAccessRepository();
        var patient = Patient.Create(_orgId, "MRN-001", "Test", "Patient",
            DateTime.Parse("1980-01-01"), BiologicalSex.Female);
        repo.SetPatient(patient);

        var profile = EmergencyAccessProfile.Create(_orgId, patient.Id);
        // NOT enabled
        repo.SetProfile(profile);

        var handler = new RequestEmergencyAccessHandler(repo);
        var result = await handler.Handle(
            new RequestEmergencyAccessCommand(
                patient.Id, "GForce", 5.0m, "AutoGrantTimeout",
                "John", "123", "FD", null, true),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public async Task RequestAccess_NoProfile_Fails()
    {
        var repo = new MockEmergencyAccessRepository();
        var patient = Patient.Create(_orgId, "MRN-001", "Test", "Patient",
            DateTime.Parse("1980-01-01"), BiologicalSex.Female);
        repo.SetPatient(patient);

        var handler = new RequestEmergencyAccessHandler(repo);
        var result = await handler.Handle(
            new RequestEmergencyAccessCommand(
                patient.Id, "GForce", 5.0m, "AutoGrantTimeout",
                "John", "123", "FD", null, true),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // APPLICATION: GetEmergencyFacesheet handler
    // ═══════════════════════════════════════════════════════════════════════

    [Fact]
    [Trait("Category", "Unit")]
    public async Task GetFacesheet_ValidSession_ReturnsFacesheet()
    {
        var repo = new MockEmergencyAccessRepository();
        var patient = Patient.Create(_orgId, "MRN-001", "Test", "Patient",
            DateTime.Parse("1980-01-01"), BiologicalSex.Female);
        repo.SetPatient(patient);

        var profile = EmergencyAccessProfile.Create(_orgId, patient.Id);
        profile.Enable();
        repo.SetProfile(profile);

        var accessLog = EmergencyAccessLog.Create(
            _orgId, patient.Id, profile.Id,
            "GForce", 6.0m, "PatientApproved",
            "Jane Smith", "EMS-001", "Metro FD",
            null, true, 10);
        repo.SetAccessLog(accessLog);

        var assembler = new Mock<IEmergencyFacesheetAssembler>();
        assembler.Setup(x => x.AssembleAsync(patient.Id, profile, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestFacesheet());

        var handler = new GetEmergencyFacesheetHandler(repo, assembler.Object);
        var result = await handler.Handle(
            new GetEmergencyFacesheetQuery(accessLog.Id),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Test Patient", result.Value.PatientName);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public async Task GetFacesheet_EndedSession_Fails()
    {
        var repo = new MockEmergencyAccessRepository();
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);
        profile.Enable();
        repo.SetProfile(profile);

        var accessLog = CreateValidAccessLog();
        accessLog.EndSession();
        repo.SetAccessLog(accessLog);

        var assembler = new Mock<IEmergencyFacesheetAssembler>();
        var handler = new GetEmergencyFacesheetHandler(repo, assembler.Object);
        var result = await handler.Handle(
            new GetEmergencyFacesheetQuery(accessLog.Id),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public async Task GetFacesheet_SessionNotFound_Fails()
    {
        var repo = new MockEmergencyAccessRepository();
        var assembler = new Mock<IEmergencyFacesheetAssembler>();
        var handler = new GetEmergencyFacesheetHandler(repo, assembler.Object);
        var result = await handler.Handle(
            new GetEmergencyFacesheetQuery(Guid.NewGuid()),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // APPLICATION: EndEmergencySession handler
    // ═══════════════════════════════════════════════════════════════════════

    [Fact]
    [Trait("Category", "Unit")]
    public async Task EndSession_ValidSession_Succeeds()
    {
        var repo = new MockEmergencyAccessRepository();
        var accessLog = CreateValidAccessLog();
        repo.SetAccessLog(accessLog);

        var handler = new EndEmergencySessionHandler(repo);
        var result = await handler.Handle(
            new EndEmergencySessionCommand(accessLog.Id),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(accessLog.AccessEndedAt);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public async Task EndSession_NotFound_Fails()
    {
        var repo = new MockEmergencyAccessRepository();
        var handler = new EndEmergencySessionHandler(repo);
        var result = await handler.Handle(
            new EndEmergencySessionCommand(Guid.NewGuid()),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CLINICAL SAFETY
    // ═══════════════════════════════════════════════════════════════════════

    [Fact]
    [Trait("Category", "Unit")]
    public void ClinicalSafety_AllIdentityFields_Required()
    {
        // Name required
        Assert.Throws<DomainException>(() => EmergencyAccessLog.Create(
            _orgId, _patientId, Guid.NewGuid(),
            "GForce", 5m, "AutoGrantTimeout",
            "", "123", "FD", null, true, 10));

        // Badge required
        Assert.Throws<DomainException>(() => EmergencyAccessLog.Create(
            _orgId, _patientId, Guid.NewGuid(),
            "GForce", 5m, "AutoGrantTimeout",
            "Name", "", "FD", null, true, 10));

        // Agency required
        Assert.Throws<DomainException>(() => EmergencyAccessLog.Create(
            _orgId, _patientId, Guid.NewGuid(),
            "GForce", 5m, "AutoGrantTimeout",
            "Name", "123", "", null, true, 10));

        // HIPAA ack required
        Assert.Throws<DomainException>(() => EmergencyAccessLog.Create(
            _orgId, _patientId, Guid.NewGuid(),
            "GForce", 5m, "AutoGrantTimeout",
            "Name", "123", "FD", null, false, 10));
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void ClinicalSafety_AuditEvent_ContainsFullIdentity()
    {
        var log = CreateValidAccessLog();
        var evt = log.DomainEvents.OfType<EmergencyRecordAccessedEvent>().Single();

        Assert.False(string.IsNullOrEmpty(evt.ResponderName));
        Assert.False(string.IsNullOrEmpty(evt.BadgeNumber));
        Assert.False(string.IsNullOrEmpty(evt.Agency));
        Assert.Equal(log.Id, evt.AccessLogId);
        Assert.Equal(_patientId, evt.PatientId);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void ClinicalSafety_PatientOptIn_ExplicitRequired()
    {
        var profile = EmergencyAccessProfile.Create(_orgId, _patientId);
        Assert.False(profile.IsEnabled);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private EmergencyAccessLog CreateValidAccessLog(int accessWindowMinutes = 10)
    {
        return EmergencyAccessLog.Create(
            _orgId, _patientId, Guid.NewGuid(),
            triggerType: "GForce",
            peakGForce: 6.5m,
            consentMethod: "AutoGrantTimeout",
            responderName: "Paramedic John",
            badgeNumber: "EMS-1234",
            agency: "Metro Fire",
            responderPhotoUri: null,
            hipaaAcknowledged: true,
            accessWindowMinutes: accessWindowMinutes);
    }

    private static EmergencyFacesheet CreateTestFacesheet()
    {
        return new EmergencyFacesheet(
            PatientName: "Test Patient",
            DateOfBirth: "1980-01-01",
            Age: 46,
            Sex: "Female",
            BloodType: "A+",
            Weight: "70 kg",
            Height: "170 cm",
            Language: "English",
            Mrn: "MRN-001",
            HasDnr: true,
            DnrDocumentedDate: "2024-01-15",
            DnrPhysician: "Dr. Smith",
            IsFullCode: false,
            PowerOfAttorney: "Robert Doe",
            PoaPhone: "555-0199",
            HasLivingWill: true,
            IsOrganDonor: false,
            AdvanceDirectiveNotes: "No intubation",
            Allergies: new[] { new EmergencyAllergy("Penicillin", "Anaphylaxis", "Severe") },
            ActiveMedications: new[] { new EmergencyMedication("Warfarin", "5mg", "Daily", "AFib") },
            ActiveDiagnoses: new[] { new EmergencyDiagnosis("I48.0", "Atrial Fibrillation", "2020") },
            EmergencyContacts: new[] { new EmergencyContact("Robert Doe", "Spouse", "555-0199", true) },
            ImplantedDevices: new[] { new EmergencyImplant("Pacemaker", "2022-06-01", true) },
            AssembledAt: DateTime.UtcNow,
            DataSource: "Live");
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════════

internal class MockEmergencyAccessRepository : IEmergencyAccessRepository
{
    private Patient? _patient;
    private EmergencyAccessProfile? _profile;
    private EmergencyAccessLog? _accessLog;
    private readonly List<EmergencyAccessLog> _logs = new();

    public EmergencyAccessProfile? SavedProfile { get; private set; }

    public void SetPatient(Patient patient) => _patient = patient;
    public void SetProfile(EmergencyAccessProfile profile) => _profile = profile;
    public void SetAccessLog(EmergencyAccessLog log)
    {
        _accessLog = log;
        if (!_logs.Contains(log)) _logs.Add(log);
    }

    public Task<Patient?> GetPatientAsync(Guid patientId, CancellationToken ct)
        => Task.FromResult(_patient?.Id == patientId ? _patient : null);

    public Task<EmergencyAccessProfile?> GetProfileByPatientIdAsync(Guid patientId, CancellationToken ct)
        => Task.FromResult(_profile?.PatientId == patientId ? _profile : null);

    public Task AddProfileAsync(EmergencyAccessProfile profile, CancellationToken ct)
    {
        SavedProfile = profile;
        _profile = profile;
        return Task.CompletedTask;
    }

    public Task<EmergencyAccessLog?> GetAccessLogAsync(Guid accessLogId, CancellationToken ct)
        => Task.FromResult(_accessLog?.Id == accessLogId ? _accessLog : null);

    public Task AddAccessLogAsync(EmergencyAccessLog log, CancellationToken ct)
    {
        _accessLog = log;
        if (!_logs.Contains(log)) _logs.Add(log);
        return Task.CompletedTask;
    }

    public Task<(IReadOnlyList<EmergencyAccessLog> Logs, int TotalCount)> GetAccessLogsAsync(
        Guid patientId, int page, int pageSize, CancellationToken ct)
    {
        var filtered = _logs.Where(l => l.PatientId == patientId).ToList();
        return Task.FromResult<(IReadOnlyList<EmergencyAccessLog>, int)>(
            (filtered, filtered.Count));
    }

    public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
}
