using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;
using ATTENDING.Infrastructure.Caching;
using ATTENDING.Infrastructure.Data;
using ATTENDING.Infrastructure.Messaging;
using ATTENDING.Infrastructure.Repositories;
using ATTENDING.Infrastructure.External;
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
        // Audit Interceptor (auto-populates CreatedBy/ModifiedBy/DeletedBy)
        // --------------------------------------------------------
        services.AddScoped<AuditSaveChangesInterceptor>();

        // --------------------------------------------------------
        // Database
        // --------------------------------------------------------
        services.AddDbContext<AttendingDbContext>((sp, options) =>
        {
            options.AddInterceptors(sp.GetRequiredService<AuditSaveChangesInterceptor>());

            var connectionString = configuration.GetConnectionString("AttendingDb");
            options.UseSqlServer(connectionString, sqlOptions =>
            {
                sqlOptions.MigrationsAssembly(typeof(AttendingDbContext).Assembly.GetName().Name);
                sqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "migrations");
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
        });  // end AddDbContext

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
            // WARNING: Not suitable for production â€” single instance, no persistence
            services.AddDistributedMemoryCache();
        }

        services.AddSingleton<IClinicalCacheService, RedisClinicalCacheService>();

        // --------------------------------------------------------
        // Distributed Lock Service
        // --------------------------------------------------------
        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            // Production: Redis-backed distributed locks (cross-node safe)
            services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(_ =>
                StackExchange.Redis.ConnectionMultiplexer.Connect(redisConnectionString));
            services.AddSingleton<ATTENDING.Domain.Interfaces.IDistributedLockService,
                Services.RedisDistributedLockService>();

        }
        else
        {
            // Development fallback: in-memory locks (single-process only)
            services.AddSingleton<ATTENDING.Domain.Interfaces.IDistributedLockService,
                Services.InMemoryDistributedLockService>();
        }

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
        services.AddScoped<IAiFeedbackRepository, AiFeedbackRepository>();

        // --------------------------------------------------------
        // Domain Services
        // --------------------------------------------------------
        services.AddScoped<IRedFlagEvaluator, RedFlagEvaluator>();

        // Drug Interaction Service — composite pattern:
        //   External API (NIH RxNorm, etc.) as primary → local rules as fallback
        var drugApiConfig = configuration.GetSection("DrugInteractionApi");
        var drugApiBaseUrl = drugApiConfig.GetValue<string>("BaseUrl");

        if (!string.IsNullOrWhiteSpace(drugApiBaseUrl))
        {
            // External API is configured — register HTTP client with resilience
            services.Configure<External.DrugInteraction.ExternalDrugInteractionOptions>(
                opts => drugApiConfig.Bind(opts));
            services.AddHttpClient<IExternalDrugInteractionApi,
                External.DrugInteraction.NihDrugInteractionClient>(client =>
            {
                client.BaseAddress = new Uri(drugApiBaseUrl);
            })
            .AddClinicalResilienceHandler("DrugInteractionAPI");
        }
        else
        {
            // No external API configured — null stub (local rules only)
            services.AddSingleton<IExternalDrugInteractionApi,
                External.DrugInteraction.NullExternalDrugInteractionClient>();
        }

        services.AddScoped<IDrugInteractionService,
            External.DrugInteraction.CompositeDrugInteractionService>();

        // --------------------------------------------------------
        // Infrastructure Services
        // --------------------------------------------------------
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<IAnalyticsService, AnalyticsService>();

        // --------------------------------------------------------
        // Clinical Intelligence Pipeline (Tiered Architecture)
        // Tier 0: Pure domain logic — guidelines, red flags, drug interactions
        // Tier 2: Cloud AI — optional enhancement when available
        // --------------------------------------------------------

        // Clinical guidelines — all implementations registered for injection
        services.AddSingleton<Domain.ClinicalGuidelines.IClinicalGuideline,
            Domain.ClinicalGuidelines.Guidelines.WellsPECriteria>();
        services.AddSingleton<Domain.ClinicalGuidelines.IClinicalGuideline,
            Domain.ClinicalGuidelines.Guidelines.HeartScore>();
        services.AddSingleton<Domain.ClinicalGuidelines.IClinicalGuideline,
            Domain.ClinicalGuidelines.Guidelines.QSofaScore>();
        services.AddSingleton<Domain.ClinicalGuidelines.IClinicalGuideline,
            Domain.ClinicalGuidelines.Guidelines.OttawaAnkleRules>();
        services.AddSingleton<Domain.ClinicalGuidelines.IClinicalGuideline,
            Domain.ClinicalGuidelines.Guidelines.Curb65Score>();

        // Guideline evaluator — runs applicable guidelines against patient data
        services.AddSingleton<Application.Services.GuidelineEvaluator>();

        // Context assembler — pulls from repos to build EnrichedClinicalContext
        services.AddScoped<IClinicalContextAssembler, ClinicalContextAssembler>();

        // Tiered intelligence orchestrator — coordinates Tier 0 + Tier 2
        services.AddScoped<ITieredClinicalIntelligence, TieredClinicalIntelligenceService>();

        // --------------------------------------------------------
        // Event Bus (conditionally overrides InProcessEventBus from Application layer)
        // InProcess: no-op here (InProcessEventBus already registered)
        // InMemory:  MassTransit in-memory transport (single-host, with pipeline)
        // AzureServiceBus: MassTransit + Azure Service Bus (multi-pod production)
        // --------------------------------------------------------
        services.AddEventBus(configuration);

        // --------------------------------------------------------
        // Background Scheduler (distributed-lock-guarded recurring jobs)
        // --------------------------------------------------------
        services.AddHostedService<Services.ClinicalSchedulerService>();

        // --------------------------------------------------------
        // AI Services — with resilience (retry + circuit breaker)
        // --------------------------------------------------------
        services.Configure<External.AI.ClinicalAiOptions>(opts =>
            configuration.GetSection("ClinicalAi").Bind(opts));
        services.AddHttpClient<External.AI.IClinicalAiService, External.AI.BioMistralClinicalAiService>(client =>
        {
            var aiOptions = configuration.GetSection("ClinicalAi").Get<External.AI.ClinicalAiOptions>();
            client.BaseAddress = new Uri(aiOptions?.BaseUrl ?? "http://localhost:11434/api");
        })
        .AddClinicalResilienceHandler("ClinicalAI");

        // --------------------------------------------------------
        // FHIR EHR Clients — with resilience
        // Two named registrations: Epic (default) and Oracle Health (Cerner).
        //
        // The default IFhirClient resolves to EpicFhirClient.
        // To use Cerner, inject IFhirClientFactory and call GetClient("cerner").
        // --------------------------------------------------------
        services.Configure<External.FHIR.FhirClientOptions>(opts =>
            configuration.GetSection("Fhir").Bind(opts));

        services.Configure<External.FHIR.FhirClientOptions>("Cerner", opts =>
            configuration.GetSection("FhirCerner").Bind(opts));

        // Epic — default IFhirClient
        services.AddHttpClient<External.FHIR.IFhirClient, External.FHIR.EpicFhirClient>(client =>
        {
            var fhirOptions = configuration.GetSection("Fhir").Get<External.FHIR.FhirClientOptions>();
            if (!string.IsNullOrWhiteSpace(fhirOptions?.BaseUrl))
                client.BaseAddress = new Uri(fhirOptions.BaseUrl);
            client.DefaultRequestHeaders.Accept.Add(
                new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/fhir+json"));
        })
        .AddClinicalResilienceHandler("EpicFHIR");

        // Oracle Health (Cerner) — named registration
        services.AddHttpClient<External.FHIR.OracleHealthFhirClient>(client =>
        {
            var cernerOptions = configuration.GetSection("FhirCerner").Get<External.FHIR.FhirClientOptions>();
            if (!string.IsNullOrWhiteSpace(cernerOptions?.BaseUrl))
                client.BaseAddress = new Uri(cernerOptions.BaseUrl);
            client.DefaultRequestHeaders.Accept.Add(
                new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/fhir+json"));
        })
        .AddClinicalResilienceHandler("CernerFHIR");

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



