using System.Text.Json;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.ValueObjects;

namespace ATTENDING.Infrastructure.External.FHIR;

/// <summary>
/// Tests FHIR connectivity by hitting the /metadata (CapabilityStatement) endpoint.
/// Works with any vendor — uses EhrVendorProfile to resolve the base URL.
/// </summary>
public class FhirConnectionTester : IFhirConnectionTester
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<FhirConnectionTester> _logger;

    public FhirConnectionTester(
        IHttpClientFactory httpClientFactory,
        ILogger<FhirConnectionTester> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<FhirConnectionTestResult> TestConnectionAsync(
        EhrConnectorConfig connector, CancellationToken cancellationToken = default)
    {
        // Resolve FHIR base URL from connector config or vendor profile template
        var baseUrl = connector.FhirBaseUrl;

        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            var profile = connector.Vendor switch
            {
                EhrVendor.Epic         => EhrVendorProfile.Epic(),
                EhrVendor.OracleHealth => EhrVendorProfile.OracleHealth(),
                EhrVendor.AthenaHealth => EhrVendorProfile.AthenaHealth(),
                _                      => EhrVendorProfile.GenericFhirR4()
            };

            var resolved = profile.ResolveTemplates(connector.EhrTenantId, connector.ClientId);
            baseUrl = resolved.FhirBaseUrlTemplate;
        }

        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return new FhirConnectionTestResult(
                false, null, Array.Empty<string>(),
                $"No FHIR base URL configured for {connector.Vendor}. " +
                "Provide FhirBaseUrl in connector configuration.");
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(15);
            client.DefaultRequestHeaders.Accept.Add(
                new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/fhir+json"));

            var metadataUrl = baseUrl.TrimEnd('/') + "/metadata";
            _logger.LogInformation(
                "Testing FHIR connection for {Vendor} at {Url}", connector.Vendor, metadataUrl);

            var response = await client.GetAsync(metadataUrl, cancellationToken);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var doc = JsonDocument.Parse(json);

            var fhirVersion = doc.RootElement.TryGetProperty("fhirVersion", out var v)
                ? v.GetString() : null;

            var resources = new List<string>();
            if (doc.RootElement.TryGetProperty("rest", out var rest) && rest.GetArrayLength() > 0)
            {
                var firstRest = rest[0];
                if (firstRest.TryGetProperty("resource", out var resList))
                {
                    foreach (var r in resList.EnumerateArray())
                    {
                        if (r.TryGetProperty("type", out var resType))
                            resources.Add(resType.GetString() ?? "");
                    }
                }
            }

            _logger.LogInformation(
                "FHIR connection verified: {Vendor} v{Version}, {Count} resources",
                connector.Vendor, fhirVersion, resources.Count);

            return new FhirConnectionTestResult(
                true, fhirVersion, resources.ToArray(), null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "FHIR connection test failed for {Vendor}: {Message}",
                connector.Vendor, ex.Message);

            return new FhirConnectionTestResult(
                false, null, Array.Empty<string>(), ex.Message);
        }
    }
}
