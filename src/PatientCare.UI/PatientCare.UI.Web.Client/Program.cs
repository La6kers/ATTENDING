using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using PatientCare.UI.Shared.Services;
using PatientCare.UI.Web.Client.Services;

namespace PatientCare.UI.Web.Client;
internal class Program
{
    static async Task Main(string[] args)
    {
        var builder = WebAssemblyHostBuilder.CreateDefault(args);

        // Add device-specific services used by the PatientCare.UI.Shared project
        builder.Services.AddSingleton<IFormFactor, FormFactor>();

        await builder.Build().RunAsync();
    }
}
