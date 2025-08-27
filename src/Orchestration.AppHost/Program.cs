using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Orchestration.AppHost;

internal class Program
{
    private static void Main(string[] args)
    {
        var builder = DistributedApplication.CreateBuilder(args);

        // Manually load user secrets for custom non-Production environments.
        if(builder.Environment.IsEnvironment("Local") || builder.Environment.IsDevelopment())
        {
            builder.Configuration.AddUserSecrets<Program>(optional: true);
        }
        var environment = builder.Environment.EnvironmentName;

        switch(environment)
        {
            case "Local":
                Builds.Local.Build(builder);
                break;
            default:
                throw new Exception($"Environment '{environment}' is not supported.");
        }

        builder.Build().Run();
    }
}