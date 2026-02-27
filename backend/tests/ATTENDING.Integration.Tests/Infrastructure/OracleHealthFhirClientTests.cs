using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using System.Net;
using System.Text.Json;
using ATTENDING.Infrastructure.External.FHIR;
using Xunit;

namespace ATTENDING.Integration.Tests.Infrastructure;

/// <summary>
/// Unit tests for OracleHealthFhirClient.
/// These tests do not require Docker or a real Cerner sandbox —
/// they use a mock HttpMessageHandler to verify query construction,
/// error handling, and the Cerner-specific ServiceRequest category injection.
/// </summary>
public class OracleHealthFhirClientTests
{
    private static OracleHealthFhirClient BuildClient(
        HttpMessageHandler handler,
        string baseUrl = "https://fhir-ehr.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/")
    {
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri(baseUrl) };
        var logger = new Mock<ILogger<OracleHealthFhirClient>>().Object;
        var options = Options.Create(new FhirClientOptions { BaseUrl = baseUrl });
        return new OracleHealthFhirClient(httpClient, logger, options);
    }

    // -----------------------------------------------------------------------
    // GetPatientAsync
    // -----------------------------------------------------------------------

    [Fact]
    public async Task GetPatientAsync_Returns_Patient_On_Success()
    {
        var patient = new FhirPatient
        {
            Id = "12724066",
            Identifier = new List<FhirIdentifier>
            {
                new() { System = "urn:oid:2.16.840.1.113883.3.13.8", Value = "MRN00001" }
            },
            Name = new List<FhirHumanName>
            {
                new() { Family = "Smart", Given = new List<string> { "Nancy" } }
            },
            BirthDate = "1980-08-11",
            Gender = "female"
        };

        var handler = new MockHttpHandler(
            HttpStatusCode.OK,
            JsonSerializer.Serialize(patient, FhirJsonOptions.Default));
        var client = BuildClient(handler);

        var result = await client.GetPatientAsync("12724066");

        Assert.NotNull(result);
        Assert.Equal("12724066", result!.Id);
        Assert.Equal("Smart", result.Name![0].Family);
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
        var handler = new ExceptionHttpHandler(new HttpRequestException("Network error"));
        var client = BuildClient(handler);

        // Must not throw — must return null (clinical workflow safety)
        var result = await client.GetPatientAsync("12724066");

        Assert.Null(result);
    }

    // -----------------------------------------------------------------------
    // GetObservationsAsync
    // -----------------------------------------------------------------------

    [Fact]
    public async Task GetObservationsAsync_Returns_Empty_On_Failure()
    {
        var handler = new MockHttpHandler(HttpStatusCode.ServiceUnavailable, string.Empty);
        var client = BuildClient(handler);

        var result = await client.GetObservationsAsync("12724066");

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetObservationsAsync_Requests_Laboratory_Category()
    {
        var capturedRequest = new MockCapturingHandler(HttpStatusCode.OK,
            JsonSerializer.Serialize(new FhirBundle<FhirObservation> { Entry = new() }, FhirJsonOptions.Default));
        var client = BuildClient(capturedRequest);

        await client.GetObservationsAsync("12724066");

        Assert.Contains("category=laboratory", capturedRequest.LastRequestUri?.Query);
    }

    // -----------------------------------------------------------------------
    // SendLabOrderAsync — Cerner-specific category injection
    // -----------------------------------------------------------------------

    [Fact]
    public async Task SendLabOrderAsync_Injects_Category_When_Missing()
    {
        string? capturedBody = null;
        var handler = new CapturingBodyHandler(
            HttpStatusCode.Created,
            body => capturedBody = body);
        var client = BuildClient(handler);

        var labOrder = new FhirServiceRequest
        {
            Code = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding> { new() { System = "http://loinc.org", Code = "2823-3" } }
            },
            Subject = new FhirReference { Reference = "Patient/12724066" }
            // No Category — Cerner requires it
        };

        var result = await client.SendLabOrderAsync(labOrder);

        Assert.True(result);
        Assert.NotNull(capturedBody);

        // Verify the serialized payload contains the Cerner laboratory SNOMED code
        Assert.Contains("108252007", capturedBody!);
        Assert.Contains("http://snomed.info/sct", capturedBody);
    }

    [Fact]
    public async Task SendLabOrderAsync_Preserves_Existing_Category()
    {
        string? capturedBody = null;
        var handler = new CapturingBodyHandler(HttpStatusCode.Created, body => capturedBody = body);
        var client = BuildClient(handler);

        var labOrder = new FhirServiceRequest
        {
            Code = new FhirCodeableConcept(),
            Category = new List<FhirCodeableConcept>
            {
                new() { Coding = new List<FhirCoding> { new() { Code = "custom-category" } } }
            }
        };

        await client.SendLabOrderAsync(labOrder);

        // The original category should be preserved, not replaced
        Assert.Contains("custom-category", capturedBody!);
        // The Cerner default SNOMED code should NOT be injected
        Assert.DoesNotContain("108252007", capturedBody);
    }

    [Fact]
    public async Task SendLabOrderAsync_Returns_False_On_Server_Error()
    {
        var handler = new MockHttpHandler(HttpStatusCode.BadRequest, string.Empty);
        var client = BuildClient(handler);

        var result = await client.SendLabOrderAsync(new FhirServiceRequest());

        Assert.False(result);
    }

    // -----------------------------------------------------------------------
    // Mock helpers
    // -----------------------------------------------------------------------

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
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage r, CancellationToken ct) => throw _ex;
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

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
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
