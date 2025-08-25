namespace ClinicalIntake.UI;
using MauiApplication = Microsoft.Maui.Controls.Application;


public partial class App : MauiApplication
{
    public App()
    {
        InitializeComponent();
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        return new Window(new MainPage()) { Title = "ClinicalIntake.UI" };
    }
}
