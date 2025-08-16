using ClinicalIntake.UI.Shared.Services;
using ClinicalIntake.UI.Web.Client.Services;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

namespace ClinicalIntake.UI.Web.Client;
internal class Program
{
    static async Task Main(string[] args)
    {
        var builder = WebAssemblyHostBuilder.CreateDefault(args);

        // Add device-specific services used by the ClinicalIntake.UI.Shared project
        builder.Services.AddSingleton<IFormFactor, FormFactor>();

        await builder.Build().RunAsync();
    }
}
