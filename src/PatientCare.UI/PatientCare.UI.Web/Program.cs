using MudBlazor.Services;
using PatientCare.UI.Shared.Services;
using PatientCare.UI.Web.Components;
using PatientCare.UI.Web.Services;

namespace PatientCare.UI;
public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        builder.Services.AddRazorComponents()
            .AddInteractiveServerComponents()
            .AddInteractiveWebAssemblyComponents();

        // Add device-specific services used by the PatientCare.UI.Shared project
        builder.Services.AddSingleton<IFormFactor, FormFactor>();

        // Add MudBlazor services
        builder.Services.AddMudServices();

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if(!app.Environment.IsProduction())
        {
            app.UseWebAssemblyDebugging();
            app.UseDeveloperExceptionPage();
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
                typeof(PatientCare.UI.Shared._Imports).Assembly,
                typeof(PatientCare.UI.Web.Client._Imports).Assembly);

        app.Run();
    }
}
