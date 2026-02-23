using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace ATTENDING.Infrastructure.Data;

/// <summary>
/// Design-time factory for EF Core migrations.
/// Used by 'dotnet ef migrations add' when the app isn't running.
/// </summary>
public class AttendingDbContextFactory : IDesignTimeDbContextFactory<AttendingDbContext>
{
    public AttendingDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "..", "ATTENDING.Orders.Api"))
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .Build();

        var optionsBuilder = new DbContextOptionsBuilder<AttendingDbContext>();
        var connectionString = configuration.GetConnectionString("AttendingDb");

        optionsBuilder.UseSqlServer(connectionString, sqlOptions =>
        {
            sqlOptions.MigrationsAssembly(typeof(AttendingDbContext).Assembly.GetName().Name);
            sqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "migrations");
        });

        return new AttendingDbContext(optionsBuilder.Options);
    }
}
