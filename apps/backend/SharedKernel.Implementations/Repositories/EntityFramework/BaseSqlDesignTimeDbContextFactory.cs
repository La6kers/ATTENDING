using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace SharedKernel.Implementations.Repositories.EntityFramework;
public abstract class BaseSqlDesignTimeDbContextFactory<TDbContext> : IDesignTimeDbContextFactory<TDbContext>
    where TDbContext : DbContext
{
    protected abstract string ConnectionStringName { get; }
    private readonly IServiceProvider _serviceProvider;

    protected BaseSqlDesignTimeDbContextFactory()
    {
        _serviceProvider = getServiceProvider(ConnectionStringName);
    }

    public TDbContext CreateDbContext(string[] args) => _serviceProvider.GetRequiredService<TDbContext>();

    private static ServiceProvider getServiceProvider(string connectionStringName)
    {
        var services = new Microsoft.Extensions.DependencyInjection.ServiceCollection();
        services.AddDbContext<TDbContext>(options =>
        {
            var connectionString = ConfigurationsHelper.Configuration.GetConnectionString(connectionStringName);
            options.UseSqlServer(connectionString);
        });

        return services.BuildServiceProvider();
    }
}