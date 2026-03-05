using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using System.Net;
using System.Text.Json;
using ATTENDING.Infrastructure.External.FHIR;
using Xunit;

namespace ATTENDING.Integration.Tests.Infrastructure;

/// <summary>
/// Unit tests for AthenaFhirClient.
/// No Docker or real athena sandbox required — all HTTP is mocked.
///
/// Covers:
///   - Happy path for every IFhirClient method
///   - Error handling (null on 404, empty list on 5xx)
///   - Network exception safety (must not throw — returns null/empty)
///   - athena-specific NKA sentinel filtering (SNOMED 716186003)
///   - Lab order SendLabOrderAsync (no category injection needed unlike Cerner)
/// </summary>
public class AthenaFhirClientTests
{
    private const string SandboxBase = "https://api.sandbox.platform.athenahealth.com/fhir/r4/";

    private static AthenaFhirClient BuildClient(HttpMessageHandler handler, string baseUrl = SandboxBase)
    {
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri(baseUrl) };
        var logger = new Mock<ILogger<AthenaFhirClient>>().Object;
        var options = Options.Create(new FhirClientOptions { BaseUrl = baseUrl });
        return new AthenaFhirClient(httpClient, logger, options);
    }

    // ───────────────────────────────────────────────────────────────────────
    // GetPatientAsync
    // ───────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetPatientAsync_Returns_Patient_On_Success()
    {
        var patient = new FhirPatient
        {
            Id = "a-12345.E-123",
            Identifier = new List<FhirIdentifier>
            {
                new() { System = "urn:oid:1.2.840.114350.1.13.0", Value = "MRN99001" }
            },
            Name = new List<FhirHumanName>
            {
                new() { Family = "Johnson", Given = new List<string> { "Robert" } }
            },
            BirthDate = "1965-03-22",
            Gender = "male"
        };

        var handler = new MockHttpHandler(
            HttpStatusCode.OK,
            JsonSerializer.Serialize(patient, FhirJsonOptions.Default));
        var client = BuildClient(handler);

        var result = await client.GetPatientAsync("a-12345.E-123");

        Assert.NotNull(result);
        Assert.Equal("a-12345.E-123", result!.Id);
        Assert.Equal("Johnson", result.Name![0].Family);
        Assert.Equal("male", result.Gender);
    }

    [Fact]
    public async Task GetPatientAsync_Returns_Null_On_404()
    {
        var handler = new MockHttpHandler(HttpStatusCode.NotFound, string.Empty);
        var client = BuildClient(handler);

        var result = await client.GetPatientAsync("does-not-exist");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetPatientAsync_Returns_Null_On_Network_Error()
    {
        var handler = new ExceptionHttpHandler(new HttpRequestException("athena unreachable"));
        var client = BuildClient(handler);

        // Must not throw — clinical workflows must degrade gracefully
        var result = await client.GetPatientAsync("a-12345");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetPatientAsync_Returns_Null_On_500()
    {
        var handler = new MockHttpHandler(HttpStatusCode.InternalServerError, string.Empty);
        var client = BuildClient(handler);

        var result = await client.GetPatientAsync("a-12345");

        Assert.Null(result);
    }

    // ───────────────────────────────────────────────────────────────────────
    // GetObservationsAsync
    // ───────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetObservationsAsync_Returns_Observations_On_Success()
    {
        var obs = new FhirObservation
        {
            Id = "obs-001",
            Status = "final",
            Code = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding>
                {
                    new() { System = "http://loinc.org", Code = "2823-3", Display = "Potassium" }
                }
            },
            ValueQuantity = new FhirQuantity { Value = 4.1m, Unit = "mEq/L" },
            EffectiveDateTime = "2026-02-15T14:30:00Z"
        };

        var bundle = new FhirBundle<FhirObservation>
        {
            Entry = new List<FhirBundleEntry<FhirObservation>>
            {
                new() { Resource = obs }
            }
        };

        var handler = new MockHttpHandler(
            HttpStatusCode.OK,
            JsonSerializer.Serialize(bundle, FhirJsonOptions.Default));
        var client = BuildClient(handler);

        var result = await client.GetObservationsAsync("a-12345");

        Assert.Single(result);
        Assert.Equal("2823-3", result[0].Code!.Coding![0].Code);
        Assert.Equal(4.1m, result[0].ValueQuantity!.Value);
    }

    [Fact]
    public async Task GetObservationsAsync_Requests_Laboratory_Category()
    {
        var capturing = new MockCapturingHandler(
            HttpStatusCode.OK,
            JsonSerializer.Serialize(
                new FhirBundle<FhirObservation> { Entry = new() }, FhirJsonOptions.Default));
        var client = BuildClient(capturing);

        await client.GetObservationsAsync("a-12345");

        Assert.Contains("category=laboratory", capturing.LastRequestUri?.Query);
    }

    [Fact]
    public async Task GetObservationsAsync_Returns_Empty_On_Service_Unavailable()
    {
        var handler = new MockHttpHandler(HttpStatusCode.ServiceUnavailable, string.Empty);
        var client = BuildClient(handler);

        var result = await client.GetObservationsAsync("a-12345");

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetObservationsAsync_Returns_Empty_On_Network_Error()
    {
        var handler = new ExceptionHttpHandler(new TaskCanceledException("timeout"));
        var client = BuildClient(handler);

        var result = await client.GetObservationsAsync("a-12345");

        Assert.Empty(result);
    }

    // ───────────────────────────────────────────────────────────────────────
    // GetMedicationsAsync
    // ───────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMedicationsAsync_Returns_Active_Medications()
    {
        var med = new FhirMedicationRequest
        {
            Id = "med-001",
            Status = "active",
            MedicationCodeableConcept = new FhirCodeableConcept
            {
                Text = "Lisinopril 10mg",
                Coding = new List<FhirCoding>
                {
                    new() { System = "http://www.nlm.nih.gov/research/umls/rxnorm", Code = "314076" }
                }
            }
        };

        var bundle = new FhirBundle<FhirMedicationRequest>
        {
            Entry = new List<FhirBundleEntry<FhirMedicationRequest>> { new() { Resource = med } }
        };

        var handler = new MockHttpHandler(
            HttpStatusCode.OK,
            JsonSerializer.Serialize(bundle, FhirJsonOptions.Default));
        var client = BuildClient(handler);

        var result = await client.GetMedicationsAsync("a-12345");

        Assert.Single(result);
        Assert.Equal("active", result[0].Status);
        Assert.Equal("Lisinopril 10mg", result[0].MedicationCodeableConcept!.Text);
    }

    [Fact]
    public async Task GetMedicationsAsync_Requests_Status_Active()
    {
        var capturing = new MockCapturingHandler(
            HttpStatusCode.OK,
            JsonSerializer.Serialize(
                new FhirBundle<FhirMedicationRequest> { Entry = new() }, FhirJsonOptions.Default));
        var client = BuildClient(capturing);

        await client.GetMedicationsAsync("a-12345");

        Assert.Contains("status=active", capturing.LastRequestUri?.Query);
    }

    [Fact]
    public async Task GetMedicationsAsync_Returns_Empty_On_Error()
    {
        var handler = new MockHttpHandler(HttpStatusCode.Unauthorized, string.Empty);
        var client = BuildClient(handler);

        var result = await client.GetMedicationsAsync("a-12345");

        Assert.Empty(result);
    }

    // ───────────────────────────────────────────────────────────────────────
    // GetConditionsAsync
    // ───────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetConditionsAsync_Returns_Active_Conditions()
    {
        var condition = new FhirCondition
        {
            Id = "cond-001",
            Code = new FhirCodeableConcept
            {
                Text = "Hypertension",
                Coding = new List<FhirCoding>
                {
                    new() { System = "http://snomed.info/sct", Code = "38341003" }
                }
            },
            OnsetDateTime = "2020-01-10"
        };

        var bundle = new FhirBundle<FhirCondition>
        {
            Entry = new List<FhirBundleEntry<FhirCondition>> { new() { Resource = condition } }
        };

        var handler = new MockHttpHandler(
            HttpStatusCode.OK,
            JsonSerializer.Serialize(bundle, FhirJsonOptions.Default));
        var client = BuildClient(handler);

        var result = await client.GetConditionsAsync("a-12345");

        Assert.Single(result);
        Assert.Equal("Hypertension", result[0].Code!.Text);
    }

    [Fact]
    public async Task GetConditionsAsync_Returns_Empty_On_Error()
    {
        var handler = new MockHttpHandler(HttpStatusCode.InternalServerError, string.Empty);
        var client = BuildClient(handler);

        var result = await client.GetConditionsAsync("a-12345");

        Assert.Empty(result);
    }

    // ───────────────────────────────────────────────────────────────────────
    // GetAllergiesAsync — NKA sentinel filtering (athena-specific behavior)
    // ───────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllergiesAsync_Filters_Out_NKA_Sentinel_Record()
    {
        // athena represents "no known allergies" as a real resource with SNOMED 716186003
        var nkaSentinel = new FhirAllergyIntolerance
        {
            Id = "allergy-nka",
            Code = new FhirCodeableConcept
            {
                Text = "No Known Allergy",
                Coding = new List<FhirCoding>
                {
                    new() { System = "http://snomed.info/sct", Code = "716186003" }
                }
            }
        };

        var realAllergy = new FhirAllergyIntolerance
        {
            Id = "allergy-penicillin",
            Code = new FhirCodeableConcept
            {
                Text = "Penicillin",
                Coding = new List<FhirCoding>
                {
                    new() { System = "http://www.nlm.nih.gov/research/umls/rxnorm", Code = "7980" }
                }
            },
            Criticality = "high"
        };

        var bundle = new FhirBundle<FhirAllergyIntolerance>
        {
            Entry = new List<FhirBundleEntry<FhirAllergyIntolerance>>
            {
                new() { Resource = nkaSentinel },
                new() { Resource = realAllergy }
            }
        };

        var handler = new MockHttpHandler(
            HttpStatusCode.OK,
            JsonSerializer.Serialize(bundle, FhirJsonOptions.Default));
        var client = BuildClient(handler);

        var result = await client.GetAllergiesAsync("a-12345");

        // NKA sentinel must be filtered — only real allergy remains
        Assert.Single(result);
        Assert.Equal("Penicillin", result[0].Code!.Text);
        Assert.DoesNotContain(result, a => a.Code?.Coding?.Any(c => c.Code == "716186003") == true);
    }

    [Fact]
    public async Task GetAllergiesAsync_Returns_Empty_List_When_Only_NKA_Present()
    {
        var nkaBundle = new FhirBundle<FhirAllergyIntolerance>
        {
            Entry = new List<FhirBundleEntry<FhirAllergyIntolerance>>
            {
                new()
                {
                    Resource = new FhirAllergyIntolerance
                    {
                        Id = "nka-only",
                        Code = new FhirCodeableConcept
                        {
                            Coding = new List<FhirCoding>
                            {
                                new() { System = "http://snomed.info/sct", Code = "716186003" }
                            }
                        }
                    }
                }
            }
        };

        var handler = new MockHttpHandler(
            HttpStatusCode.OK,
            JsonSerializer.Serialize(nkaBundle, FhirJsonOptions.Default));
        var client = BuildClient(handler);

        var result = await client.GetAllergiesAsync("a-12345");

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAllergiesAsync_Returns_All_Real_Allergies_Without_Sentinel()
    {
        var allergy1 = new FhirAllergyIntolerance
        {
            Id = "al-001",
            Code = new FhirCodeableConcept { Text = "Sulfa" },
            Criticality = "high"
        };
        var allergy2 = new FhirAllergyIntolerance
        {
            Id = "al-002",
            Code = new FhirCodeableConcept { Text = "Aspirin" },
            Criticality = "low"
        };

        var bundle = new FhirBundle<FhirAllergyIntolerance>
        {
            Entry = new List<FhirBundleEntry<FhirAllergyIntolerance>>
            {
                new() { Resource = allergy1 },
                new() { Resource = allergy2 }
            }
        };

        var handler = new MockHttpHandler(
            HttpStatusCode.OK,
            JsonSerializer.Serialize(bundle, FhirJsonOptions.Default));
        var client = BuildClient(handler);

        var result = await client.GetAllergiesAsync("a-12345");

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAllergiesAsync_Returns_Empty_On_Error()
    {
        var handler = new MockHttpHandler(HttpStatusCode.Forbidden, string.Empty);
        var client = BuildClient(handler);

        var result = await client.GetAllergiesAsync("a-12345");

        Assert.Empty(result);
    }

    // ───────────────────────────────────────────────────────────────────────
    // SendLabOrderAsync — athena does NOT require Cerner-style category injection
    // ───────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task SendLabOrderAsync_Returns_True_On_Success()
    {
        var handler = new MockHttpHandler(HttpStatusCode.Created, string.Empty);
        var client = BuildClient(handler);

        var labOrder = new FhirServiceRequest
        {
            Code = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding>
                {
                    new() { System = "http://loinc.org", Code = "4548-4", Display = "HbA1c" }
                }
            },
            Subject = new FhirReference { Reference = "Patient/a-12345" },
            Priority = "routine"
        };

        var result = await client.SendLabOrderAsync(labOrder);

        Assert.True(result);
    }

    [Fact]
    public async Task SendLabOrderAsync_Does_Not_Inject_Cerner_Category()
    {
        // Unlike OracleHealthFhirClient, AthenaFhirClient must NOT inject
        // the Cerner-specific SNOMED laboratory category (108252007)
        string? capturedBody = null;
        var handler = new CapturingBodyHandler(HttpStatusCode.Created, body => capturedBody = body);
        var client = BuildClient(handler);

        var labOrder = new FhirServiceRequest
        {
            Code = new FhirCodeableConcept(),
            // No Category provided — athena does not require it
        };

        await client.SendLabOrderAsync(labOrder);

        Assert.NotNull(capturedBody);
        // The Cerner SNOMED code must NOT appear in athena's payload
        Assert.DoesNotContain("108252007", capturedBody!);
    }

    [Fact]
    public async Task SendLabOrderAsync_Returns_False_On_Bad_Request()
    {
        var handler = new MockHttpHandler(HttpStatusCode.BadRequest, string.Empty);
        var client = BuildClient(handler);

        var result = await client.SendLabOrderAsync(new FhirServiceRequest());

        Assert.False(result);
    }

    [Fact]
    public async Task SendLabOrderAsync_Returns_False_On_Network_Error()
    {
        var handler = new ExceptionHttpHandler(new HttpRequestException("connection refused"));
        var client = BuildClient(handler);

        var result = await client.SendLabOrderAsync(new FhirServiceRequest());

        Assert.False(result);
    }

    // ───────────────────────────────────────────────────────────────────────
    // Mock helpers (same pattern as OracleHealthFhirClientTests)
    // ───────────────────────────────────────────────────────────────────────

    private sealed class MockHttpHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _status;
        private readonly string _body;

        public MockHttpHandler(HttpStatusCode status, string body)
        {
            _status = status;
            _body = body;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken ct)
            => Task.FromResult(new HttpResponseMessage(_status)
            {
                Content = new StringContent(_body, System.Text.Encoding.UTF8, "application/fhir+json")
            });
    }

    private sealed class ExceptionHttpHandler : HttpMessageHandler
    {
        private readonly Exception _ex;
        public ExceptionHttpHandler(Exception ex) => _ex = ex;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage r, CancellationToken ct)
            => throw _ex;
    }

    private sealed class MockCapturingHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _status;
        private readonly string _body;
        public Uri? LastRequestUri { get; private set; }

        public MockCapturingHandler(HttpStatusCode status, string body)
        {
            _status = status;
            _body = body;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            LastRequestUri = request.RequestUri;
            return Task.FromResult(new HttpResponseMessage(_status)
            {
                Content = new StringContent(_body, System.Text.Encoding.UTF8, "application/fhir+json")
            });
        }
    }

    private sealed class CapturingBodyHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _status;
        private readonly Action<string> _capture;

        public CapturingBodyHandler(HttpStatusCode status, Action<string> capture)
        {
            _status = status;
            _capture = capture;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken ct)
        {
            if (request.Content != null)
            {
                var body = await request.Content.ReadAsStringAsync(ct);
                _capture(body);
            }
            return new HttpResponseMessage(_status)
            {
                Content = new StringContent(string.Empty)
            };
        }
    }
}
