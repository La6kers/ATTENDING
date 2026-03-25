using System.Text.RegularExpressions;

namespace ATTENDING.Domain.ValueObjects;

/// <summary>
/// Strongly-typed Patient ID
/// </summary>
public record PatientId
{
    public Guid Value { get; }
    
    private PatientId(Guid value) => Value = value;
    
    public static PatientId Create() => new(Guid.NewGuid());
    public static PatientId From(Guid value) => new(value);
    public static PatientId From(string value) => new(Guid.Parse(value));
    
    public override string ToString() => Value.ToString();
    
    public static implicit operator Guid(PatientId id) => id.Value;
    public static implicit operator string(PatientId id) => id.Value.ToString();
}

/// <summary>
/// Strongly-typed User ID
/// </summary>
public record UserId
{
    public Guid Value { get; }
    
    private UserId(Guid value) => Value = value;
    
    public static UserId Create() => new(Guid.NewGuid());
    public static UserId From(Guid value) => new(value);
    public static UserId From(string value) => new(Guid.Parse(value));
    
    public override string ToString() => Value.ToString();
    
    public static implicit operator Guid(UserId id) => id.Value;
}

/// <summary>
/// Strongly-typed Encounter ID
/// </summary>
public record EncounterId
{
    public Guid Value { get; }
    
    private EncounterId(Guid value) => Value = value;
    
    public static EncounterId Create() => new(Guid.NewGuid());
    public static EncounterId From(Guid value) => new(value);
    public static EncounterId From(string value) => new(Guid.Parse(value));
    
    public override string ToString() => Value.ToString();
    
    public static implicit operator Guid(EncounterId id) => id.Value;
}

/// <summary>
/// Strongly-typed Lab Order ID
/// </summary>
public record LabOrderId
{
    public Guid Value { get; }
    
    private LabOrderId(Guid value) => Value = value;
    
    public static LabOrderId Create() => new(Guid.NewGuid());
    public static LabOrderId From(Guid value) => new(value);
    public static LabOrderId From(string value) => new(Guid.Parse(value));
    
    public override string ToString() => Value.ToString();
    
    public static implicit operator Guid(LabOrderId id) => id.Value;
}

/// <summary>
/// ICD-10 Diagnosis Code value object
/// </summary>
public record ICD10Code
{
    private static readonly Regex ICD10Pattern = new(@"^[A-Z]\d{2}(\.\d{1,2})?$", RegexOptions.Compiled);
    
    public string Code { get; }
    public string Description { get; }
    
    private ICD10Code(string code, string description)
    {
        Code = code;
        Description = description;
    }
    
    public static ICD10Code Create(string code, string description = "")
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("ICD-10 code cannot be empty", nameof(code));
            
        var normalizedCode = code.ToUpperInvariant().Trim();
        
        if (!ICD10Pattern.IsMatch(normalizedCode))
            throw new ArgumentException($"Invalid ICD-10 code format: {code}", nameof(code));
            
        return new ICD10Code(normalizedCode, description);
    }
    
    public override string ToString() => Code;
}

/// <summary>
/// CPT (Current Procedural Terminology) Code value object
/// </summary>
public record CPTCode
{
    private static readonly Regex CPTPattern = new(@"^\d{5}(-\d{2})?$", RegexOptions.Compiled);
    
    public string Code { get; }
    public string Description { get; }
    public decimal? BasePrice { get; }
    
    private CPTCode(string code, string description, decimal? basePrice)
    {
        Code = code;
        Description = description;
        BasePrice = basePrice;
    }
    
    public static CPTCode Create(string code, string description = "", decimal? basePrice = null)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("CPT code cannot be empty", nameof(code));
            
        var normalizedCode = code.Trim();
        
        if (!CPTPattern.IsMatch(normalizedCode))
            throw new ArgumentException($"Invalid CPT code format: {code}", nameof(code));
            
        return new CPTCode(normalizedCode, description, basePrice);
    }
    
    public override string ToString() => Code;
}

/// <summary>
/// LOINC (Logical Observation Identifiers Names and Codes) value object
/// </summary>
public record LOINCCode
{
    private static readonly Regex LOINCPattern = new(@"^\d{1,5}-\d$", RegexOptions.Compiled);
    
    public string Code { get; }
    public string Description { get; }
    
    private LOINCCode(string code, string description)
    {
        Code = code;
        Description = description;
    }
    
    public static LOINCCode Create(string code, string description = "")
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("LOINC code cannot be empty", nameof(code));
            
        var normalizedCode = code.Trim();
        
        // LOINC codes have format like "12345-6"
        if (!LOINCPattern.IsMatch(normalizedCode))
            throw new ArgumentException($"Invalid LOINC code format: {code}", nameof(code));
            
        return new LOINCCode(normalizedCode, description);
    }
    
    public override string ToString() => Code;
}

/// <summary>
/// NPI (National Provider Identifier) value object
/// </summary>
public record NPI
{
    private static readonly Regex NPIPattern = new(@"^\d{10}$", RegexOptions.Compiled);
    
    public string Value { get; }
    
    private NPI(string value) => Value = value;
    
    public static NPI Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("NPI cannot be empty", nameof(value));
            
        var normalizedValue = value.Trim();
        
        if (!NPIPattern.IsMatch(normalizedValue))
            throw new ArgumentException($"Invalid NPI format: {value}. Must be 10 digits.", nameof(value));
            
        // Validate using Luhn algorithm (NPI uses a variation)
        if (!ValidateLuhn(normalizedValue))
            throw new ArgumentException($"Invalid NPI checksum: {value}", nameof(value));
            
        return new NPI(normalizedValue);
    }
    
    private static bool ValidateLuhn(string npi)
    {
        // NPI Luhn validation with prefix "80840"
        var prefixedNpi = "80840" + npi;
        var sum = 0;
        var alternate = false;
        
        for (var i = prefixedNpi.Length - 1; i >= 0; i--)
        {
            var digit = int.Parse(prefixedNpi[i].ToString());
            
            if (alternate)
            {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            
            sum += digit;
            alternate = !alternate;
        }
        
        return sum % 10 == 0;
    }
    
    public override string ToString() => Value;
}

/// <summary>
/// Email address value object with validation
/// </summary>
public record Email
{
    private static readonly Regex EmailPattern = new(
        @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
        RegexOptions.Compiled);
    
    public string Value { get; }
    
    private Email(string value) => Value = value;
    
    public static Email Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Email cannot be empty", nameof(value));
            
        var normalizedValue = value.Trim().ToLowerInvariant();
        
        if (!EmailPattern.IsMatch(normalizedValue))
            throw new ArgumentException($"Invalid email format: {value}", nameof(value));
            
        return new Email(normalizedValue);
    }
    
    public override string ToString() => Value;
}

/// <summary>
/// Phone number value object
/// </summary>
public record PhoneNumber
{
    public string Value { get; }
    public string Formatted { get; }
    
    private PhoneNumber(string value, string formatted)
    {
        Value = value;
        Formatted = formatted;
    }
    
    public static PhoneNumber Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Phone number cannot be empty", nameof(value));
            
        // Remove all non-digits
        var digitsOnly = new string(value.Where(char.IsDigit).ToArray());
        
        if (digitsOnly.Length < 10 || digitsOnly.Length > 11)
            throw new ArgumentException($"Invalid phone number: {value}", nameof(value));
            
        // Normalize to 10 digits (remove leading 1 if present)
        if (digitsOnly.Length == 11 && digitsOnly.StartsWith("1"))
            digitsOnly = digitsOnly[1..];
            
        var formatted = $"({digitsOnly[..3]}) {digitsOnly[3..6]}-{digitsOnly[6..]}";
        
        return new PhoneNumber(digitsOnly, formatted);
    }
    
    public override string ToString() => Formatted;
}
