using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using ATTENDING.Contracts.Requests;
using ATTENDING.Integration.Tests.Fixtures;
using Xunit;

namespace ATTENDING.Integration.Tests.Api;

/// <summary>
/// HTTP-level integration tests for Imaging Orders, Medications, and Referrals controllers.
/// Tests run against an in-memory database via AttendingWebApplicationFactory.
/// </summary>
public class ImagingMedicationsReferralsControllerTests : IClassFixture<AttendingWebApplicationFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public ImagingMedicationsReferralsControllerTests(AttendingWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ================================================================
    // Helpers
    // ================================================================

    private async Task<Guid> CreatePatientAsync(string mrnPrefix = "IMG")
    {
        var mrn = $"{mrnPrefix}-{Guid.NewGuid():N}"[..(mrnPrefix.Length + 13)];
        var response = await _client.PostAsJsonAsync("/api/v1/patients", new CreatePatientRequest(
            MRN: mrn, FirstName: "Test", LastName: "Patient",
            DateOfBirth: new DateTime(1980, 5, 15), Sex: "Male",
            Phone: null, Email: null, AddressLine1: null,
            City: null, State: null, ZipCode: null, PrimaryLanguage: "English"));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return Guid.Parse(response.Headers.Location!.ToString().Split('/').Last());
    }

    private async Task<Guid> CreateEncounterAsync(Guid patientId)
    {
        var response = await _client.PostAsJsonAsync("/api/v1/encounters",
            new CreateEncounterRequest(patientId, "Office Visit", null, null));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return Guid.Parse(response.Headers.Location!.ToString().Split('/').Last());
    }

    // ================================================================
    // Imaging Orders
    // ================================================================

    [Fact]
    public async Task ImagingOrders_GetById_NotFound_ShouldReturn404()
    {
        var response = await _client.GetAsync($"/api/v1/imagingorders/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ImagingOrders_GetByPatient_EmptyResult_ShouldReturn200()
    {
        var response = await _client.GetAsync($"/api/v1/imagingorders/patient/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ImagingOrders_GetByEncounter_ShouldReturn200()
    {
        var response = await _client.GetAsync($"/api/v1/imagingorders/encounter/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ImagingOrders_Create_ValidRequest_ShouldReturn201()
    {
        var patientId = await CreatePatientAsync("XR");
        var encounterId = await CreateEncounterAsync(patientId);

        var request = new CreateImagingOrderRequest(
            PatientId: patientId,
            EncounterId: encounterId,
            StudyCode: "XR-CHEST",
            StudyName: "Chest X-Ray PA/Lateral",
            Modality: "XR",
            BodyPart: "Chest",
            Laterality: null,
            WithContrast: false,
            CptCode: "71046",
            Priority: "Routine",
            ClinicalIndication: "Cough and fever, rule out pneumonia",
            DiagnosisCode: "J18.9",
            EstimatedRadiationDose: 0.1m);

        var response = await _client.PostAsJsonAsync("/api/v1/imagingorders", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("studyName").GetString().Should().Be("Chest X-Ray PA/Lateral");
        body.GetProperty("orderNumber").GetString().Should().StartWith("IMG-");
    }

    [Fact]
    public async Task ImagingOrders_Create_ThenGetById_ShouldSucceed()
    {
        var patientId = await CreatePatientAsync("CT");
        var encounterId = await CreateEncounterAsync(patientId);

        var createResp = await _client.PostAsJsonAsync("/api/v1/imagingorders",
            new CreateImagingOrderRequest(
                PatientId: patientId, EncounterId: encounterId,
                StudyCode: "CT-HEAD", StudyName: "CT Head without contrast",
                Modality: "CT", BodyPart: "Head", Laterality: null,
                WithContrast: false, CptCode: "70450",
                Priority: "Routine", ClinicalIndication: "Headache",
                DiagnosisCode: "R51.9", EstimatedRadiationDose: 2.0m));

        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var orderId = Guid.Parse(createResp.Headers.Location!.ToString().Split('/').Last());

        var getResp = await _client.GetAsync($"/api/v1/imagingorders/{orderId}");
        getResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await getResp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("id").GetGuid().Should().Be(orderId);
        body.GetProperty("modality").GetString().Should().Be("CT");
    }

    [Fact]
    public async Task ImagingOrders_Create_ThenGetByPatient_ShouldReturnOrder()
    {
        var patientId = await CreatePatientAsync("MRI");
        var encounterId = await CreateEncounterAsync(patientId);

        await _client.PostAsJsonAsync("/api/v1/imagingorders",
            new CreateImagingOrderRequest(
                PatientId: patientId, EncounterId: encounterId,
                StudyCode: "MRI-KNEE", StudyName: "MRI Knee without contrast",
                Modality: "MRI", BodyPart: "Knee", Laterality: "Left",
                WithContrast: false, CptCode: "73721",
                Priority: "Routine", ClinicalIndication: "Knee pain",
                DiagnosisCode: "M25.361", EstimatedRadiationDose: null));

        var getResp = await _client.GetAsync($"/api/v1/imagingorders/patient/{patientId}");
        getResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await getResp.Content.ReadAsStringAsync();
        body.Should().Contain("MRI-KNEE");
    }

    [Fact]
    public async Task ImagingOrders_RadiationDose_ShouldReturn200()
    {
        var response = await _client.GetAsync($"/api/v1/imagingorders/patient/{Guid.NewGuid()}/radiation-dose");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("riskLevel").GetString().Should().Be("Low");
    }

    [Fact]
    public async Task ImagingOrders_Create_ThenSchedule_ShouldReturn204()
    {
        var patientId = await CreatePatientAsync("SCH");
        var encounterId = await CreateEncounterAsync(patientId);

        var createResp = await _client.PostAsJsonAsync("/api/v1/imagingorders",
            new CreateImagingOrderRequest(
                PatientId: patientId, EncounterId: encounterId,
                StudyCode: "US-ABD", StudyName: "Abdominal Ultrasound",
                Modality: "US", BodyPart: "Abdomen", Laterality: null,
                WithContrast: false, CptCode: "76700",
                Priority: "Routine", ClinicalIndication: "RUQ pain",
                DiagnosisCode: "R10.11", EstimatedRadiationDose: null));
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var orderId = Guid.Parse(createResp.Headers.Location!.ToString().Split('/').Last());

        var scheduleResp = await _client.PostAsJsonAsync(
            $"/api/v1/imagingorders/{orderId}/schedule",
            new { scheduledAt = DateTime.UtcNow.AddDays(3), location = "Radiology Suite A" });

        scheduleResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task ImagingOrders_Cancel_NotFound_ShouldReturn404()
    {
        var response = await _client.PostAsJsonAsync(
            $"/api/v1/imagingorders/{Guid.NewGuid()}/cancel",
            new CancelOrderRequest("Duplicate order"));
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ImagingOrders_Create_ThenCancel_ShouldReturn204()
    {
        var patientId = await CreatePatientAsync("CXL");
        var encounterId = await CreateEncounterAsync(patientId);

        var createResp = await _client.PostAsJsonAsync("/api/v1/imagingorders",
            new CreateImagingOrderRequest(
                PatientId: patientId, EncounterId: encounterId,
                StudyCode: "XR-RIB", StudyName: "Rib X-Ray",
                Modality: "XR", BodyPart: "Ribs", Laterality: null,
                WithContrast: false, CptCode: "71100",
                Priority: "Routine", ClinicalIndication: "Rib pain after trauma",
                DiagnosisCode: "S29.009A", EstimatedRadiationDose: 0.1m));
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var orderId = Guid.Parse(createResp.Headers.Location!.ToString().Split('/').Last());

        var cancelResp = await _client.PostAsJsonAsync(
            $"/api/v1/imagingorders/{orderId}/cancel",
            new CancelOrderRequest("Patient declined"));
        cancelResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // ================================================================
    // Medications Controller
    // ================================================================

    [Fact]
    public async Task Medications_GetById_NotFound_ShouldReturn404()
    {
        var response = await _client.GetAsync($"/api/v1/medications/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Medications_GetByPatient_ShouldReturn200()
    {
        var response = await _client.GetAsync($"/api/v1/medications/patient/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Medications_GetActiveByPatient_ShouldReturn200()
    {
        var response = await _client.GetAsync($"/api/v1/medications/patient/{Guid.NewGuid()}/active");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Medications_GetByEncounter_ShouldReturn200()
    {
        var response = await _client.GetAsync($"/api/v1/medications/encounter/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Medications_Create_ValidRequest_ShouldReturn201()
    {
        var patientId = await CreatePatientAsync("MED");
        var encounterId = await CreateEncounterAsync(patientId);

        var request = new CreateMedicationOrderRequest(
            PatientId: patientId,
            EncounterId: encounterId,
            MedicationCode: "RXN-1234",
            MedicationName: "Amoxicillin",
            GenericName: "Amoxicillin",
            Strength: "500mg",
            Form: "Capsule",
            Route: "Oral",
            Frequency: "Three times daily",
            Dosage: "500mg TID",
            Quantity: 30,
            Refills: 0,
            Instructions: "Take with food",
            ClinicalIndication: "Bacterial sinusitis",
            DiagnosisCode: "J32.0",
            IsControlledSubstance: false,
            DeaSchedule: null,
            PharmacyId: null,
            PharmacyName: "Main Street Pharmacy");

        var response = await _client.PostAsJsonAsync("/api/v1/medications", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("medicationName").GetString().Should().Be("Amoxicillin");
        body.GetProperty("orderNumber").GetString().Should().StartWith("RX-");
    }

    [Fact]
    public async Task Medications_Create_PatientNotFound_ShouldReturn404()
    {
        var request = new CreateMedicationOrderRequest(
            PatientId: Guid.NewGuid(),
            EncounterId: Guid.NewGuid(),
            MedicationCode: "RXN-0001",
            MedicationName: "Ibuprofen",
            GenericName: "Ibuprofen",
            Strength: "400mg",
            Form: "Tablet",
            Route: "Oral",
            Frequency: "As needed",
            Dosage: "400mg PRN",
            Quantity: 20,
            Refills: 1,
            Instructions: null,
            ClinicalIndication: "Pain",
            DiagnosisCode: "R52",
            IsControlledSubstance: false);

        var response = await _client.PostAsJsonAsync("/api/v1/medications", request);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Medications_Create_ThenGetById_ShouldSucceed()
    {
        var patientId = await CreatePatientAsync("MGET");
        var encounterId = await CreateEncounterAsync(patientId);

        var createResp = await _client.PostAsJsonAsync("/api/v1/medications",
            new CreateMedicationOrderRequest(
                PatientId: patientId, EncounterId: encounterId,
                MedicationCode: "RXN-5678", MedicationName: "Lisinopril",
                GenericName: "Lisinopril", Strength: "10mg", Form: "Tablet",
                Route: "Oral", Frequency: "Once daily", Dosage: "10mg QD",
                Quantity: 30, Refills: 3, Instructions: null,
                ClinicalIndication: "Hypertension", DiagnosisCode: "I10",
                IsControlledSubstance: false));

        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var medId = Guid.Parse(createResp.Headers.Location!.ToString().Split('/').Last());

        var getResp = await _client.GetAsync($"/api/v1/medications/{medId}");
        getResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await getResp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("medicationName").GetString().Should().Be("Lisinopril");
    }

    [Fact]
    public async Task Medications_CheckInteractions_PatientNotFound_ShouldReturn404()
    {
        var response = await _client.PostAsJsonAsync(
            $"/api/v1/medications/patient/{Guid.NewGuid()}/check-interactions",
            new { newMedicationName = "Warfarin" });
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Medications_CheckInteractions_ValidPatient_ShouldReturn200()
    {
        var patientId = await CreatePatientAsync("INT");

        var response = await _client.PostAsJsonAsync(
            $"/api/v1/medications/patient/{patientId}/check-interactions",
            new { newMedicationName = "Aspirin" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Medications_Create_ThenDiscontinue_ShouldReturn204()
    {
        var patientId = await CreatePatientAsync("DISC");
        var encounterId = await CreateEncounterAsync(patientId);

        var createResp = await _client.PostAsJsonAsync("/api/v1/medications",
            new CreateMedicationOrderRequest(
                PatientId: patientId, EncounterId: encounterId,
                MedicationCode: "RXN-9999", MedicationName: "Metformin",
                GenericName: "Metformin", Strength: "500mg", Form: "Tablet",
                Route: "Oral", Frequency: "Twice daily", Dosage: "500mg BID",
                Quantity: 60, Refills: 5, Instructions: "Take with meals",
                ClinicalIndication: "Type 2 diabetes", DiagnosisCode: "E11.9",
                IsControlledSubstance: false));
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var medId = Guid.Parse(createResp.Headers.Location!.ToString().Split('/').Last());

        var discResp = await _client.PostAsJsonAsync(
            $"/api/v1/medications/{medId}/discontinue",
            new { reason = "Patient intolerance - GI side effects" });
        discResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Medications_Discontinue_NotFound_ShouldReturn404()
    {
        var response = await _client.PostAsJsonAsync(
            $"/api/v1/medications/{Guid.NewGuid()}/discontinue",
            new { reason = "Reason" });
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ================================================================
    // Referrals Controller
    // ================================================================

    [Fact]
    public async Task Referrals_GetById_NotFound_ShouldReturn404()
    {
        var response = await _client.GetAsync($"/api/v1/referrals/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Referrals_GetByPatient_ShouldReturn200()
    {
        var response = await _client.GetAsync($"/api/v1/referrals/patient/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Referrals_Create_ValidRequest_ShouldReturn201()
    {
        var patientId = await CreatePatientAsync("REF");
        var encounterId = await CreateEncounterAsync(patientId);

        var request = new CreateReferralRequest(
            PatientId: patientId,
            EncounterId: encounterId,
            Specialty: "Cardiology",
            Urgency: "Standard",
            ClinicalQuestion: "Evaluation of atrial fibrillation",
            DiagnosisCode: "I48.0",
            ReasonForReferral: "New onset AFib, needs cardiology workup",
            ReferredToProviderId: null,
            ReferredToProviderName: null,
            ReferredToFacility: "Regional Heart Center");

        var response = await _client.PostAsJsonAsync("/api/v1/referrals", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
    }

    [Fact]
    public async Task Referrals_Create_ThenGetById_ShouldSucceed()
    {
        var patientId = await CreatePatientAsync("REFGET");
        var encounterId = await CreateEncounterAsync(patientId);

        var createResp = await _client.PostAsJsonAsync("/api/v1/referrals",
            new CreateReferralRequest(
                PatientId: patientId, EncounterId: encounterId,
                Specialty: "Orthopedics", Urgency: "High",
                ClinicalQuestion: "Evaluation of knee pain - possible meniscus tear",
                DiagnosisCode: "M23.200",
                ReasonForReferral: "Failed conservative management",
                ReferredToProviderId: null, ReferredToProviderName: null,
                ReferredToFacility: null));

        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var referralId = Guid.Parse(createResp.Headers.Location!.ToString().Split('/').Last());

        var getResp = await _client.GetAsync($"/api/v1/referrals/{referralId}");
        getResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await getResp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("specialty").GetString().Should().Be("Orthopedics");
    }

    [Fact]
    public async Task Referrals_Create_PatientNotFound_ShouldReturn404OrBadRequest()
    {
        var request = new CreateReferralRequest(
            PatientId: Guid.NewGuid(), EncounterId: Guid.NewGuid(),
            Specialty: "Neurology", Urgency: "Standard",
            ClinicalQuestion: "Headaches", DiagnosisCode: "R51.9",
            ReasonForReferral: null, ReferredToProviderId: null,
            ReferredToProviderName: null, ReferredToFacility: null);

        var response = await _client.PostAsJsonAsync("/api/v1/referrals", request);
        ((int)response.StatusCode).Should().BeOneOf(400, 404);
    }

    [Fact]
    public async Task Referrals_GetPending_ShouldReturn200()
    {
        var response = await _client.GetAsync("/api/v1/referrals/pending");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
