using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace ATTENDING.Integration.Tests.Security;

/// <summary>
/// Verifies that the DevBypass hard gate in Program.cs throws
/// InvalidOperationException when DevBypass is enabled outside Development.
/// This prevents a regression from silently removing the safety check.
/// </summary>
public class DevBypassGateTests
{
    [Fact]
    public void Startup_Throws_When_DevBypass_Enabled_In_NonDevelopment_Environment()
    {
        // Arrange: create a factory that sets Staging + DevBypass=true
        var exception = Assert.Throws<InvalidOperationException>(() =>
        {
            var factory = new WebApplicationFactory<Program>()
                .WithWebHostBuilder(builder =>
                {
                    builder.UseEnvironment("Staging");
                    builder.ConfigureAppConfiguration((context, config) =>
                    {
                        config.AddInMemoryCollection(new Dictionary<string, string?>
                        {
                            ["Authentication:DevBypass"] = "true"
                        });
                    });
                });

            // Force the host to build, which triggers Program.cs startup
            _ = factory.Server;
        });

        // Assert: the exception message mentions DevBypass and the environment
        Assert.Contains("DevBypass", exception.Message);
        Assert.Contains("Staging", exception.Message);
    }

    [Fact]
    public void Startup_Throws_When_DevBypass_Enabled_In_Production_Environment()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
        {
            var factory = new WebApplicationFactory<Program>()
                .WithWebHostBuilder(builder =>
                {
                    builder.UseEnvironment("Production");
                    builder.ConfigureAppConfiguration((context, config) =>
                    {
                        config.AddInMemoryCollection(new Dictionary<string, string?>
                        {
                            ["Authentication:DevBypass"] = "true",
                            // Provide required production configs to avoid other startup errors
                            ["ForwardedHeaders:TrustedProxyCIDRs:0"] = "10.0.0.0/8",
                            ["AzureKeyVault:Uri"] = "https://test-vault.vault.azure.net/"
                        });
                    });
                });

            _ = factory.Server;
        });

        Assert.Contains("DevBypass", exception.Message);
    }
}
