using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Interfaces;
using ATTENDING.Domain.Services;
using ATTENDING.Infrastructure.Caching;
using ATTENDING.Infrastructure.Data;
using ATTENDING.Infrastructure.Messaging;
using ATTENDING.Infrastructure.Repositories;
using ATTENDING.Infrastructure.External;
using ATTENDING.Infrastructure.Services;
using ATTENDING.Infrastructure.Resilience;

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
        // Use DbContext pooling for production (reduces allocation overhead).
        // Pool size defaults to 1024; CommandTimeout and retry handle transients.
        services.AddDbContextPool<AttendingDbContext>((sp, options) =>
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
                // ADO.NET connection pooling: explicit min/max to handle burst traffic
                sqlOptions.MinBatchSize(1);
            });

            // Enable detailed errors in development
            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            {
                options.EnableSensitiveDataLogging();
                options.EnableDetailedErrors();
            }
        }, poolSize: 256);  // 256 pooled DbContext instances

        // Unit of Work
        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<AttendingDbContext>());

        // --------------------------------------------------------
        // Database Circuit Breaker (Polly)
        // Wraps database operations with a circuit breaker to prevent
        // cascading failures when SQL Server is unreachable.
        // EF Core's EnableRetryOnFailure handles transient retries;
        // this circuit breaker stops all attempts when the DB is truly down.
        // --------------------------------------------------------
        services.AddSingleton<IDbCircuitBreakerPolicy>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<DbCircuitBreakerPolicy>>();
            return new DbCircuitBreakerPolicy(logger);
        });

        // --------------------------------------------------------
        // Distributed Cache (Redis or in-memory fallback)
        // --------------------------------------------------------
        var redisConnectionString = configuration.GetConnectionString("Redis");

        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            // Production/staging: use Redis with connection resilience
            services.AddStackExchangeRedisCache(options =>
            {
                options.ConfigurationOptions = StackExchange.Redis.ConfigurationOptions.Parse(redisConnectionString);
                options.ConfigurationOptions.AbortOnConnectFail = false;
                options.ConfigurationOptions.ConnectRetry = 3;
                options.ConfigurationOptions.ReconnectRetryPolicy = new StackExchange.Redis.ExponentialRetry(5000);
                options.ConfigurationOptions.ConnectTimeout = 10000;
                options.ConfigurationOptions.SyncTimeout = 5000;
                options.InstanceName = "attending:";
            });
        }
        else
        {
            // Development fallback: in-memory distributed cache
            // WARNING: Not suitable for production – single instance, no persistence
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
            {
                var opts = StackExchange.Redis.ConfigurationOptions.Parse(redisConnectionString);
                opts.AbortOnConnectFail = false;
                opts.ConnectRetry = 3;
                opts.ReconnectRetryPolicy = new StackExchange.Redis.ExponentialRetry(5000);
                return StackExchange.Redis.ConnectionMultiplexer.Connect(opts);
            });
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

        // ML Diagnostic Learning Engine (d5)
        services.AddScoped<IDiagnosticLearningRepository, DiagnosticLearningRepository>();

        // Ambient Scribe
        services.AddScoped<IEncounterRecordingRepository, EncounterRecordingRepository>();

        // Behavioral Health
        services.AddScoped<IBehavioralHealthRepository, BehavioralHealthRepository>();
        services.AddScoped<Domain.Services.BehavioralHealthScoringService>();

        // Organization / Onboarding repositories (cross-tenant)
        services.AddScoped<IOrganizationRepository, OrganizationRepository>();
        services.AddScoped<IEhrConnectorRepository, EhrConnectorRepository>();

        // Emergency Access repository + facesheet assembler
        services.AddScoped<IEmergencyAccessRepository, EmergencyAccessRepository>();
        services.AddScoped<Application.Commands.EmergencyAccess.IEmergencyFacesheetAssembler,
            Services.EmergencyFacesheetAssembler>();

        // --------------------------------------------------------
        // Domain Services
        // --------------------------------------------------------
        services.AddScoped<IRedFlagEvaluator, RedFlagEvaluator>();

        // Drug Interaction Service — multi-source composite pattern:
        //   1. External APIs (NIH RxNorm + OpenFDA) checked in parallel
        //   2. Results cached in distributed cache (Redis / in-memory)
        //   3. Local hardcoded rules as fallback if all external sources fail
        //
        // Pipeline: CompositeDrugInteractionService
        //   → CachedDrugInteractionDecorator
        //     → MultiSourceDrugInteractionClient
        //       → NihDrugInteractionClient (pharmacokinetic interactions)
        //       → OpenFdaAdverseEventClient (post-market adverse event signals)
        var drugApiConfig = configuration.GetSection("DrugInteractionApi");
        var drugApiBaseUrl = drugApiConfig.GetValue<string>("BaseUrl");

        if (!string.IsNullOrWhiteSpace(drugApiBaseUrl))
        {
            // External APIs configured — register HTTP clients
            services.Configure<External.DrugInteraction.ExternalDrugInteractionOptions>(
                opts => drugApiConfig.Bind(opts));

            // NIH RxNorm client (named registration)
            services.AddHttpClient<External.DrugInteraction.NihDrugInteractionClient>(client =>
            {
                client.BaseAddress = new Uri(drugApiBaseUrl);
            })
            .AddClinicalResilienceHandler("DrugInteractionAPI");

            // OpenFDA adverse event client
            var openFdaConfig = configuration.GetSection("OpenFda");
            var openFdaOptions = new External.DrugInteraction.OpenFdaOptions();
            openFdaConfig.Bind(openFdaOptions);
            services.AddSingleton(openFdaOptions);

            services.AddHttpClient<External.DrugInteraction.OpenFdaAdverseEventClient>(client =>
            {
                client.BaseAddress = new Uri(openFdaOptions.BaseUrl);
            })
            .AddClinicalResilienceHandler("OpenFDA");

            // Cache options
            var cacheOptions = new External.DrugInteraction.DrugInteractionCacheOptions();
            configuration.GetSection("DrugInteractionCache").Bind(cacheOptions);
            services.AddSingleton(cacheOptions);

            // Wire up: MultiSource(NIH + OpenFDA) → Cached → Composite
            services.AddScoped<IExternalDrugInteractionApi>(sp =>
            {
                var nihClient = sp.GetRequiredService<External.DrugInteraction.NihDrugInteractionClient>();
                var openFdaClient = sp.GetRequiredService<External.DrugInteraction.OpenFdaAdverseEventClient>();

                var sources = new IExternalDrugInteractionApi[] { nihClient, openFdaClient };
                var multiSource = new External.DrugInteraction.MultiSourceDrugInteractionClient(
                    sources,
                    sp.GetRequiredService<ILogger<External.DrugInteraction.MultiSourceDrugInteractionClient>>());

                return new External.DrugInteraction.CachedDrugInteractionDecorator(
                    multiSource,
                    sp.GetRequiredService<Microsoft.Extensions.Caching.Distributed.IDistributedCache>(),
                    sp.GetRequiredService<External.DrugInteraction.DrugInteractionCacheOptions>(),
                    sp.GetRequiredService<ILogger<External.DrugInteraction.CachedDrugInteractionDecorator>>());
            });
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
        services.AddScoped<Soc2EvidenceService>();

        // --------------------------------------------------------
        // Plug-and-Play Onboarding Services
        // --------------------------------------------------------
        services.AddScoped<IFhirConnectionTester, External.FHIR.FhirConnectionTester>();
        services.AddScoped<ISyntheticDataSeeder, SyntheticDataSeeder>();

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

        // Behavioral health guidelines
        services.AddSingleton<Domain.ClinicalGuidelines.IClinicalGuideline,
            Domain.ClinicalGuidelines.Guidelines.Phq9DepressionGuideline>();
        services.AddSingleton<Domain.ClinicalGuidelines.IClinicalGuideline,
            Domain.ClinicalGuidelines.Guidelines.Gad7AnxietyGuideline>();
        services.AddSingleton<Domain.ClinicalGuidelines.IClinicalGuideline,
            Domain.ClinicalGuidelines.Guidelines.CssrsSuicideRiskGuideline>();
        services.AddSingleton<Domain.ClinicalGuidelines.IClinicalGuideline,
            Domain.ClinicalGuidelines.Guidelines.AuditCAlcoholGuideline>();
        services.AddSingleton<Domain.ClinicalGuidelines.IClinicalGuideline,
            Domain.ClinicalGuidelines.Guidelines.PcPtsd5Guideline>();

        // Guideline evaluator — runs applicable guidelines against patient data
        services.AddSingleton<Application.Services.GuidelineEvaluator>();

        // Context assembler — pulls from repos to build EnrichedClinicalContext
        services.AddScoped<IClinicalContextAssembler, ClinicalContextAssembler>();

        // Tiered intelligence orchestrator — coordinates Tier 0 + Tier 2
        services.AddScoped<ITieredClinicalIntelligence, TieredClinicalIntelligenceService>();

        // Calibrated diagnostic reasoning (d3) — guideline scores → post-test probabilities
        services.AddScoped<Application.Services.DiagnosticReasoningService>();

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
        // Ambient Scribe AI Service — with resilience (retry + circuit breaker)
        // Default model: claude-3-5-haiku (fast, cost-effective for transcription)
        // Override via appsettings: AmbientScribe:Model, BaseUrl, ApiKey, TimeoutSeconds
        //
        // NOTE: Only one registration. A duplicate bare AddHttpClient<IAmbientScribeService>
        // call was removed — it registered without a timeout or resilience handler and
        // would have overwritten this one in the service container.
        // --------------------------------------------------------
        services.Configure<External.AI.AmbientScribeOptions>(opts =>
            configuration.GetSection("AmbientScribe").Bind(opts));
        services.AddHttpClient<IAmbientScribeService, External.AI.AnthropicAmbientScribeService>(client =>
        {
            var opts = configuration.GetSection("AmbientScribe").Get<External.AI.AmbientScribeOptions>();
            client.Timeout = TimeSpan.FromSeconds(opts?.TimeoutSeconds ?? 60);
        })
        .AddClinicalResilienceHandler("AmbientScribe");

        // --------------------------------------------------------
        // AI Services — additional with resilience
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

        // athenahealth — named registration
        // Dominant EHR in independent rural practices (RHTP target market)
        // Sandbox: https://api.sandbox.platform.athenahealth.com/fhir/r4
        services.Configure<External.FHIR.FhirClientOptions>("Athena", opts =>
            configuration.GetSection("FhirAthena").Bind(opts));

        services.AddHttpClient<External.FHIR.AthenaFhirClient>(client =>
        {
            var athenaOptions = configuration.GetSection("FhirAthena").Get<External.FHIR.FhirClientOptions>();
            var baseUrl = athenaOptions?.BaseUrl
                ?? "https://api.sandbox.platform.athenahealth.com/fhir/r4";
            client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
            client.DefaultRequestHeaders.Accept.Add(
                new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/fhir+json"));
        })
        .AddClinicalResilienceHandler("AthenaFHIR");

        // IFhirClientFactory — per-organization dynamic client resolution
        // Reads EhrConnectorConfig from DB and returns the correct IConfiguredFhirClient
        services.AddScoped<IFhirClientFactory, Services.FhirClientFactoryService>();

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

        // Add distributed lock health check
        // Verifies that the lock service (Redis or in-memory) is operational.
        // Critical for production deployments using the ClinicalSchedulerService
        // to ensure distributed locks can be acquired without concurrency issues.
        healthChecks.AddCheck<DistributedLockHealthCheck>(
            "distributed-lock",
            tags: new[] { "distributed", "lock", "scheduler" });

        return services;
    }
}


