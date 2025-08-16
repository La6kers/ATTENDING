using Microsoft.JSInterop;

namespace ClinicalIntake.UI.Shared.Interop;

public static class JSInteropHelper
{
    public static async Task ScrollToBottom(IJSRuntime jsRuntime, string elementId)
    {
        await jsRuntime.InvokeVoidAsync("scrollToBottom", elementId);
    }
}