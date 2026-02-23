using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;
using ATTENDING.Infrastructure.Caching;
using ATTENDING.Infrastructure.Data;
using ATTENDING.Infrastructure.Repositories;
using ATTENDING.Infrastructure.Services;

namespace ATTENDING.Infrastructure;

/// <summary>
/// Dependency injection configuration for Infrastructure layer
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // --------------------------------------------------------
        // Database
        // --------------------------------------------------------
        services.AddDbContext<AttendingDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("AttendingDb");
            options.UseSqlServer(connectionString, sqlOptions =>
            {
                sqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorNumbersToAdd: null);
                sqlOptions.CommandTimeout(30);
            });
            
            // Enable detailed errors in development
            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            {
                options.EnableSensitiveDataLogging();
                options.EnableDetailedErrors();
            }
        });

        // Unit of Work
        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<AttendingDbContext>());

        // --------------------------------------------------------
        // Distributed Cache (Redis or in-memory fallback)
        // --------------------------------------------------------
        var redisConnectionString = configuration.GetConnectionString("Redis");

        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            // Production/staging: use Redis
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnectionString;
                options.InstanceName = "attending:";
            });
        }
        else
        {
            // Development fallback: in-memory distributed cache
            // WARNING: Not suitable for production — single instance, no persistence
            services.AddDistributedMemoryCache();
        }

        services.AddSingleton<IClinicalCacheService, RedisClinicalCacheService>();

        // --------------------------------------------------------
        // Repositories
        // --------------------------------------------------------
        services.AddScoped<IPatientRepository, PatientRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IEncounterRepository, EncounterRepository>();
        services.AddScoped<ILabOrderRepository, LabOrderRepository>();
        services.AddScoped<IImagingOrderRepository, ImagingOrderRepository>();
        services.AddScoped<IMedicationOrderRepository, MedicationOrderRepository>();
        services.AddScoped<IReferralRepository, ReferralRepository>();
        services.AddScoped<IAssessmentRepository, AssessmentRepository>();

        // --------------------------------------------------------
        // Domain Services
        // --------------------------------------------------------
        services.AddScoped<IRedFlagEvaluator, RedFlagEvaluator>();
        services.AddScoped<IDrugInteractionService, DrugInteractionService>();

        // --------------------------------------------------------
        // Infrastructure Services
        // --------------------------------------------------------
        services.AddScoped<IAuditService, AuditService>();

        return services;
    }

    /// <summary>
    /// Add health checks for infrastructure dependencies
    /// </summary>
    public static IServiceCollection AddInfrastructureHealthChecks(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var healthChecks = services.AddHealthChecks()
            .AddDbContextCheck<AttendingDbContext>("database")
            .AddSqlServer(
                configuration.GetConnectionString("AttendingDb")!,
                name: "sqlserver",
                tags: new[] { "db", "sql", "sqlserver" });

        // Add Redis health check if configured
        var redisConnectionString = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            healthChecks.AddRedis(
                redisConnectionString,
                name: "redis",
                tags: new[] { "cache", "redis" });
        }

        return services;
    }
}
