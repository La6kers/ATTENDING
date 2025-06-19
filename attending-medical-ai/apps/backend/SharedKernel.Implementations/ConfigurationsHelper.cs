using Microsoft.Extensions.Configuration;

namespace SharedKernel.Implementations;
public static class ConfigurationsHelper
{
    public static Constants.Environment Environment => _environment.Value;
    public static IConfiguration Configuration => _configuration.Value;

    private static readonly Lazy<IConfiguration> _configuration = new(getConfiguration);
    private static readonly Lazy<Constants.Environment> _environment = new(getEnvironment);

    private static Constants.Environment getEnvironment()
    {
        string? environment = System.Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT");
        if(string.IsNullOrWhiteSpace(environment))
            return Constants.Environment.Undefined;

        return (Constants.Environment)Enum.Parse(typeof(Constants.Environment), environment);
    }
    private static IConfiguration getConfiguration()
    {
        var configurationBuilder = new ConfigurationBuilder()
            .AddEnvironmentVariables()
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);

        switch(Environment)
        {
            case Constants.Environment.Local:
                configurationBuilder
                    .AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true)
                    .AddJsonFile("local.settings.json", optional: true, reloadOnChange: true);
                break;
            case Constants.Environment.Development:
                configurationBuilder
                    .AddJsonFile("appsettings.Development.json", optional: true, reloadOnChange: true);
                break;
            case Constants.Environment.Testing:
                configurationBuilder
                    .AddJsonFile("appsettings.Testing.json", optional: true, reloadOnChange: true);
                break;
            case Constants.Environment.Staging:
                configurationBuilder
                    .AddJsonFile("appsettings.Staging.json", optional: true, reloadOnChange: true);
                break;
            case Constants.Environment.Production:
                configurationBuilder
                    .AddJsonFile("appsettings.Production.json", optional: true, reloadOnChange: true);
                break;
            default:
                break;
        }

        return configurationBuilder.Build();
    }
}