using ATTENDING.Application.Behaviors;
using Xunit;

namespace ATTENDING.Integration.Tests.Validators;

/// <summary>
/// Tests for the InputSanitizationBehavior.
///
/// Healthcare sanitization must balance two concerns:
///   1. Strip genuinely dangerous content (XSS, script injection)
///   2. Preserve legitimate clinical text that contains special characters
///
/// Clinical text legitimately includes:
///   - Angle brackets:  "BP &lt; 120/80", "O2 sat &gt; 95%", "temp &lt; 100.4°F"
///   - Ampersands:      "D&amp;C", "L&amp;D", "T&amp;A"
///   - Quotes:          Patient states "I feel dizzy"
///   - Medical terms:   "&lt;1cm mass", "C-section", "STAT order"
/// </summary>
public class InputSanitizationTests
{
    // ================================================================
    // XSS Attack Patterns — Must Be Stripped
    // ================================================================

    [Theory]
    [InlineData("<script>alert('xss')</script>", "")]
    [InlineData("<script type='text/javascript'>document.cookie</script>", "")]
    [InlineData("<SCRIPT SRC=http://evil.com/xss.js></SCRIPT>", "")]
    [InlineData("Hello<script>alert(1)</script>World", "HelloWorld")]
    public void Strips_Script_Tags_And_Content(string input, string expected)
    {
        var result = InputSanitizationBehavior<object, object>.SanitizeString(input);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("<iframe src='http://evil.com'></iframe>", "")]
    [InlineData("<object data='exploit.swf'></object>", "")]
    [InlineData("<embed src='exploit.swf'>", "")]
    [InlineData("<applet code='Evil.class'></applet>", "")]
    [InlineData("<base href='http://evil.com'>", "")]
    [InlineData("<svg onload='alert(1)'>", "")]
    public void Strips_Dangerous_Tags(string input, string expected)
    {
        var result = InputSanitizationBehavior<object, object>.SanitizeString(input);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("<div onclick=\"alert(1)\">click me</div>", "<div>click me</div>")]
    [InlineData("<img onerror=\"alert(1)\" src=\"x\">", "<img src=\"x\">")]
    public void Strips_Event_Handler_Attributes(string input, string expected)
    {
        var result = InputSanitizationBehavior<object, object>.SanitizeString(input);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("javascript:alert(1)", "alert(1)")]
    [InlineData("vbscript:msgbox('xss')", "msgbox('xss')")]
    public void Strips_Dangerous_URI_Schemes(string input, string expected)
    {
        var result = InputSanitizationBehavior<object, object>.SanitizeString(input);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("<style>body{background:url('javascript:alert(1)')}</style>", "")]
    [InlineData("<style>*{xss:expression(alert(1))}</style>", "")]
    public void Strips_Style_Blocks(string input, string expected)
    {
        var result = InputSanitizationBehavior<object, object>.SanitizeString(input);
        Assert.Equal(expected, result);
    }

    // ================================================================
    // Form Injection — Must Be Stripped
    // ================================================================

    [Fact]
    public void Strips_Form_And_Input_Tags()
    {
        var input = "<form action='http://evil.com'><input type='hidden' name='token' value='stolen'></form>";
        var result = InputSanitizationBehavior<object, object>.SanitizeString(input);
        Assert.DoesNotContain("form", result, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("input", result, StringComparison.OrdinalIgnoreCase);
    }

    // ================================================================
    // Clinical Text — Must Be Preserved
    // ================================================================

    [Theory]
    [InlineData("BP < 120/80 mmHg")]
    [InlineData("O2 saturation > 95%")]
    [InlineData("Temperature < 100.4°F")]
    [InlineData("WBC count >12,000/μL")]
    [InlineData("Tumor size <1cm, no growth")]
    [InlineData("Heart rate 60-100 bpm, SBP > 90")]
    public void Preserves_Clinical_Comparisons(string input)
    {
        var result = InputSanitizationBehavior<object, object>.SanitizeString(input);
        Assert.Equal(input, result);
    }

    [Theory]
    [InlineData("D&C procedure scheduled")]
    [InlineData("L&D admission at 39 weeks")]
    [InlineData("T&A recommended for pediatric patient")]
    [InlineData("Smith & Jones Medical Group")]
    public void Preserves_Clinical_Abbreviations_With_Ampersands(string input)
    {
        var result = InputSanitizationBehavior<object, object>.SanitizeString(input);
        Assert.Equal(input, result);
    }

    [Theory]
    [InlineData("Patient states \"I have chest pain\"")]
    [InlineData("STAT order for CBC, BMP, troponin")]
    [InlineData("C-section at 38 weeks due to breech presentation")]
    [InlineData("Drop foot condition — possible L4-L5 herniation")]
    [InlineData("Patient's O'Brien file")]
    [InlineData("Assessment: R/O PE, DVT")]
    [InlineData("Dx: HTN, DM2, CKD Stage 3")]
    [InlineData("Allergies: PCN (rash), sulfa (anaphylaxis)")]
    public void Preserves_Common_Clinical_Text(string input)
    {
        var result = InputSanitizationBehavior<object, object>.SanitizeString(input);
        Assert.Equal(input, result);
    }

    // ================================================================
    // Edge Cases
    // ================================================================

    [Fact]
    public void Handles_Null_Input()
    {
        var result = InputSanitizationBehavior<object, object>.SanitizeString(null!);
        Assert.Null(result);
    }

    [Fact]
    public void Handles_Empty_String()
    {
        var result = InputSanitizationBehavior<object, object>.SanitizeString(string.Empty);
        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void Handles_Whitespace_Only()
    {
        var result = InputSanitizationBehavior<object, object>.SanitizeString("   ");
        Assert.Equal("", result);
    }

    [Theory]
    [InlineData("Normal clinical note with no special characters")]
    [InlineData("12345")]
    [InlineData("test@email.com")]
    public void Returns_Clean_Input_Unchanged(string input)
    {
        var result = InputSanitizationBehavior<object, object>.SanitizeString(input);
        Assert.Equal(input, result);
    }

    [Fact]
    public void Strips_Mixed_Dangerous_Content_But_Preserves_Clinical_Text()
    {
        var input = "Patient BP < 120/80. <script>alert('xss')</script> STAT CBC ordered.";
        var expected = "Patient BP < 120/80. STAT CBC ordered.";
        var result = InputSanitizationBehavior<object, object>.SanitizeString(input);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Strips_Nested_Script_Tags()
    {
        var input = "<script><script>alert('nested')</script></script>";
        var result = InputSanitizationBehavior<object, object>.SanitizeString(input);
        Assert.DoesNotContain("script", result, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("alert", result, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Handles_Multiple_Dangerous_Patterns_In_One_Input()
    {
        var input = "<iframe src='x'></iframe>Normal text<script>bad()</script>" +
                    "<object>more bad</object>More normal text";
        var result = InputSanitizationBehavior<object, object>.SanitizeString(input);
        Assert.DoesNotContain("iframe", result, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("script", result, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("object", result, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Normal text", result);
        Assert.Contains("More normal text", result);
    }
}
