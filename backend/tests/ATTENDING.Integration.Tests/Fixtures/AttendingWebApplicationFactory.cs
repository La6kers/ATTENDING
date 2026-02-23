using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ATTENDING.Infrastructure.Data;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Integration.Tests.Fixtures;

/// <summary>
/// Custom WebApplicationFactory that swaps SQL Server for InMemory database
/// and disables authentication for testing
/// </summary>
public class AttendingWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // Remove existing DbContext registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AttendingDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            // Remove existing DbContext
            var dbContextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(AttendingDbContext));
            if (dbContextDescriptor != null)
                services.Remove(dbContextDescriptor);

            // Add InMemory database
            var dbName = $"AttendingApiTest_{Guid.NewGuid():N}";
            services.AddDbContext<AttendingDbContext>(options =>
                options.UseInMemoryDatabase(dbName));

            services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<AttendingDbContext>());

            // Replace audit service with stub
            var auditDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IAuditService));
            if (auditDescriptor != null)
                services.Remove(auditDescriptor);
            services.AddScoped<IAuditService, StubAuditService>();
        });
    }
}
