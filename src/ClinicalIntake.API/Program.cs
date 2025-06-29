
using ClinicalIntake.Application.SubContext.Chat;
using Orchestration.ServiceDefaults;
using SharedKernel;

namespace ClinicalIntake.API;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.AddServiceDefaults();

        // Add services to the container.

        builder.Services.AddControllers();
        // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
        builder.Services.AddOpenApi();

        // add application services
        builder.Services.AddScoped<Mediator>();
        builder.Services.AddSubContextClinicalIntakeChat()
            .AddImplementationClinicalIntakeChatAzureOpenAI();

        var app = builder.Build();

        app.MapDefaultEndpoints();

        // Configure the HTTP request pipeline.
        if(!app.Environment.IsProduction())
            app.MapOpenApi();

        app.UseHttpsRedirection();

        app.UseAuthorization();


        app.MapControllers();

        app.Run();
    }
}
