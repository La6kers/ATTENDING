namespace SharedKernel.Implementations;
public static class Constants
{
    public static class DOTNET_ENVIRONMENT
    {
        public const string Local = "Local";
        public const string Development = "Development";
        public const string Testing = "Testing";
        public const string Staging = "Staging";
        public const string Production = "Production";
    }

    public enum Environment
    {
        Undefined,
        Local,
        Development,
        Testing,
        Staging,
        Production
    }

    public static class EfCoreProviderName
    {
        public const string SqlServer = "Microsoft.EntityFrameworkCore.SqlServer";
        public const string Sqlite = "Microsoft.EntityFrameworkCore.Sqlite";
        public const string Npgsql = "Npgsql.EntityFrameworkCore.PostgreSQL";
        public const string MySql = "Pomelo.EntityFrameworkCore.MySql";
        public const string InMemory = "Microsoft.EntityFrameworkCore.InMemory";
    }
}
