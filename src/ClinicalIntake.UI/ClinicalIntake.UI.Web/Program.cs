using ClinicalIntake.Application.Chat;
using ClinicalIntake.UI.Shared.Services;
using ClinicalIntake.UI.Web.Components;
using ClinicalIntake.UI.Web.Services;
using MudBlazor.Services;
using Orchestration.ServiceDefaults;

namespace ClinicalIntake.UI;
public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.AddServiceDefaults();

        // Add services to the container.
        builder.Services.AddRazorComponents()
            .AddInteractiveServerComponents()
            .AddInteractiveWebAssemblyComponents();

        // Add device-specific services used by the ClinicalIntake.UI.Shared project
        builder.Services.AddSingleton<IFormFactor, FormFactor>();

        // Add MudBlazor services
        builder.Services.AddMudServices();

        // Add environment variable for ClinicalIntake API URL
        builder.Services.AddClinicalIntakeChatClient();

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if(app.Environment.IsDevelopment())
        {
            app.UseWebAssemblyDebugging();
        }
        else
        {
            app.UseExceptionHandler("/Error");
            // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
            app.UseHsts();
        }

        app.UseHttpsRedirection();

        app.UseStaticFiles();
        app.UseAntiforgery();

        app.MapRazorComponents<App>()
            .AddInteractiveServerRenderMode()
            .AddInteractiveWebAssemblyRenderMode()
            .AddAdditionalAssemblies(
                typeof(Shared._Imports).Assembly,
                typeof(Web.Client._Imports).Assembly);

        app.Run();
    }
}
