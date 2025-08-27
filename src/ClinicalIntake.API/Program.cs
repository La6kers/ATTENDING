using ClinicalIntake.Application.Chat;
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
        //builder.Services.AddOpenApi();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        // add application services
        builder.Services.AddScoped<Mediator>();
        builder.Services.AddClinicalIntakeChatService();

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if(!app.Environment.IsProduction())
        {
            //app.MapOpenApi("openapi");
            app.UseSwagger()
               .UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseAuthorization();

        app.MapControllers();

        app.MapDefaultEndpoints();

        app.Run();
    }
}
