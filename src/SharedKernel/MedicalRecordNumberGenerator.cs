namespace SharedKernel;
public static class MedicalRecordNumberGenerator
{
    public static string Generate(int clinicId)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(clinicId, 1);

        var datePart = DateTime.UtcNow.ToString("yyyyMMdd");
        var randomPart = Random.Shared.Next(100000, 999999).ToString();

        return $"{clinicId:D8}-{datePart}-{randomPart}";
    }
}
