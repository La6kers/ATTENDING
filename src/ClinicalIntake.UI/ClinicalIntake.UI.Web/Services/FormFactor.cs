using ClinicalIntake.UI.Shared.Services;

namespace ClinicalIntake.UI.Web.Services;
public class FormFactor : IFormFactor
{
    public string GetFormFactor()
    {
        return "Web";
    }

    public string GetPlatform()
    {
        return Environment.OSVersion.ToString();
    }
}
