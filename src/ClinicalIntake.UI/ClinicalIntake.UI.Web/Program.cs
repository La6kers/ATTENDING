using ClinicalIntake.UI.Shared.Services;
using ClinicalIntake.UI.Web.Components;
using ClinicalIntake.UI.Web.Services;
using MudBlazor.Services;

namespace ClinicalIntake.UI.Web;
public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.AddServiceDefaults();

        // Add services to the container.
        builder.Services.AddRazorComponents()
            .AddInteractiveServerComponents();

        // Add device-specific services used by the ClinicalIntake.UI.Shared project
        builder.Services.AddSingleton<IFormFactor, FormFactor>();

        // Add MudBlazor services
        builder.Services.AddMudServices();

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if(!app.Environment.IsDevelopment())
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
            .AddAdditionalAssemblies(typeof(Shared._Imports).Assembly);

        app.Run();
    }
}
