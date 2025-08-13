using PatientCare.UI.Shared.Services;

namespace PatientCare.UI.Web.Client.Services;
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
