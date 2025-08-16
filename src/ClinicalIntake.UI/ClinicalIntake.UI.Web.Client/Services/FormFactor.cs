using ClinicalIntake.UI.Shared.Services;

namespace ClinicalIntake.UI.Web.Client.Services;
public class FormFactor : IFormFactor
{
    public string GetFormFactor()
    {
        return "WebAssembly";
    }

    public string GetPlatform()
    {
        return Environment.OSVersion.ToString();
    }
}
