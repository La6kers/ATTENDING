namespace SharedKernel;
public static class MedicalRecordNumberGenerator
{
    public static string Generate()
    {
        var datePart = DateTime.UtcNow.ToString("yyyyMMdd");
        var randomPart = Random.Shared.Next(100000, 999999).ToString();

        return $"{datePart}-{randomPart}";
    }
}
