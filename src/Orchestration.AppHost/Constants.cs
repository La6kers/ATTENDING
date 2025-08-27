namespace Orchestration.AppHost;
internal static class Constants
{
    public static class ServiceBusEmulator
    {
        public const string DefaultConnectionString = "Endpoint=sb://localhost:5099;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=SAS_KEY_VALUE;UseDevelopmentEmulator=true;";
    }

    public static class CosmosDbEmulator
    {
        public const string DefaultAccountKey = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";
    }
}
