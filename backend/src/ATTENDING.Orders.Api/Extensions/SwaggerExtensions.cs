using Microsoft.OpenApi.Models;
using System.Reflection;

namespace ATTENDING.Orders.Api.Extensions;

/// <summary>
/// Enhanced Swagger/OpenAPI configuration for ATTENDING AI clinical API.
/// Provides interactive documentation with authentication, grouping, and examples.
/// </summary>
public static class SwaggerExtensions
{
    public static IServiceCollection AddAttendingSwagger(this IServiceCollection services)
    {
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "ATTENDING AI Clinical API",
                Version = "v1",
                Description = """
                    ATTENDING AI is a clinical decision support platform for healthcare providers.
                    
                    ## Authentication
                    All endpoints require a valid JWT bearer token from Azure AD B2C.
                    In development mode, the DevAuthHandler provides automatic authentication.
                    
                    ## Multi-Tenant
                    All requests are scoped to the authenticated user's organization (tenant).
                    Cross-tenant data access is prevented at the database query level.
                    
                    ## Rate Limiting
                    API endpoints are rate-limited. See response headers for limit details:
                    - `X-RateLimit-Limit`: Maximum requests per window
                    - `X-RateLimit-Remaining`: Remaining requests
                    - `X-RateLimit-Reset`: Window reset time (UTC epoch)
                    """,
                Contact = new OpenApiContact
                {
                    Name = "ATTENDING AI Engineering",
                    Email = "engineering@attending.ai",
                },
                License = new OpenApiLicense
                {
                    Name = "Proprietary — HIPAA-regulated",
                }
            });

            // JWT Bearer authentication
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Description = """
                    JWT Authorization header using the Bearer scheme.
                    Enter 'Bearer' followed by a space and your token.
                    Example: 'Bearer eyJhbGciOi...'
                    """,
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT"
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });

            // Group endpoints by controller
            options.TagActionsBy(api =>
            {
                if (api.GroupName != null) return new[] { api.GroupName };
                if (api.ActionDescriptor is Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor descriptor)
                    return new[] { descriptor.ControllerName };
                return new[] { "Other" };
            });

            // Order tags logically for clinical workflow
            options.OrderActionsBy(apiDesc => 
            {
                var order = apiDesc.GroupName switch
                {
                    "Patients" => "01",
                    "Encounters" => "02", 
                    "Assessments" => "03",
                    "LabOrders" => "04",
                    "ImagingOrders" => "05",
                    "Medications" => "06",
                    "Referrals" => "07",
                    "ClinicalAi" => "08",
                    "Analytics" => "09",
                    "Admin" => "10",
                    "System" => "11",
                    _ => "99"
                };
                return $"{order}_{apiDesc.RelativePath}";
            });

            // Include XML comments from all assemblies
            var xmlFiles = Directory.GetFiles(AppContext.BaseDirectory, "*.xml", SearchOption.TopDirectoryOnly);
            foreach (var xmlFile in xmlFiles)
            {
                options.IncludeXmlComments(xmlFile, includeControllerXmlComments: true);
            }

            // Custom schema IDs to avoid conflicts
            options.CustomSchemaIds(type => type.FullName?.Replace("+", "."));

            // Add response headers documentation
            options.OperationFilter<ApiVersionHeaderFilter>();
        });

        return services;
    }

    public static WebApplication UseAttendingSwagger(this WebApplication app)
    {
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger(options =>
            {
                options.RouteTemplate = "api-docs/{documentName}/swagger.json";
            });

            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/api-docs/v1/swagger.json", "ATTENDING AI v1");
                options.RoutePrefix = "api-docs";
                options.DocumentTitle = "ATTENDING AI — API Documentation";
                
                // UI customization
                options.DefaultModelsExpandDepth(1);
                options.DefaultModelRendering(Swashbuckle.AspNetCore.SwaggerUI.ModelRendering.Model);
                options.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.List);
                options.EnableDeepLinking();
                options.DisplayRequestDuration();
                options.EnableFilter();
                options.ShowExtensions();
                options.EnableTryItOutByDefault();
            });
        }

        return app;
    }
}

/// <summary>
/// Adds X-Api-Version and deprecation headers to Swagger operation documentation
/// </summary>
public class ApiVersionHeaderFilter : Swashbuckle.AspNetCore.SwaggerGen.IOperationFilter
{
    public void Apply(OpenApiOperation operation, Swashbuckle.AspNetCore.SwaggerGen.OperationFilterContext context)
    {
        operation.Responses.ToList().ForEach(response =>
        {
            response.Value.Headers["X-Api-Version"] = new OpenApiHeader
            {
                Description = "Current API version",
                Schema = new OpenApiSchema { Type = "string", Example = new Microsoft.OpenApi.Any.OpenApiString("1.0") }
            };
            response.Value.Headers["X-Correlation-Id"] = new OpenApiHeader
            {
                Description = "Request correlation ID for distributed tracing",
                Schema = new OpenApiSchema { Type = "string", Format = "uuid" }
            };
        });
    }
}
