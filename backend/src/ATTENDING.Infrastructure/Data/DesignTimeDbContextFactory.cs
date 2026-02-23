using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace ATTENDING.Infrastructure.Data;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AttendingDbContext>
{
    public AttendingDbContext CreateDbContext(string[] args)
    {
        var basePath = Path.Combine(Directory.GetCurrentDirectory(), "..", "ATTENDING.Orders.Api");

        var configuration = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .Build();

        var connectionString = configuration.GetConnectionString("AttendingDb")
            ?? "Server=localhost,1433;Database=attending_db;User Id=sa;Password=Attending_Dev_2026!;TrustServerCertificate=True;MultipleActiveResultSets=true";

        var optionsBuilder = new DbContextOptionsBuilder<AttendingDbContext>();
        optionsBuilder.UseSqlServer(connectionString, sqlOptions =>
        {
            sqlOptions.MigrationsAssembly(typeof(AttendingDbContext).Assembly.GetName().Name);
            sqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "migrations");
        });

        return new AttendingDbContext(optionsBuilder.Options);
    }
}
