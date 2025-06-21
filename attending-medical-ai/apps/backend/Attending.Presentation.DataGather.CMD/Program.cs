namespace Attending.Presentation.DataGather.CMD;

internal static class Program
{
    private const string _familyPracticeBaseUrl = "https://fpnotebook.com";

    static async Task Main(string[] args)
    {
        using var httpClient = new HttpClient()
        {
            BaseAddress = new Uri(_familyPracticeBaseUrl)
        };

        // Symptoms
        var symptoms = await getSymptoms(httpClient);
        await getSymptomsDetails(httpClient, symptoms);
        await saveSymptomsToCsv(symptoms);

        // Examinations
        var examinations = await getExaminations(httpClient);
        await getExaminationsDetails(httpClient, examinations);
        await saveExaminationsToCsv(examinations);

        // Medications
        var medications = await getMedications(httpClient);
        await getMedicationsDetails(httpClient, medications);
        await saveMedicationsToCsv(medications);

        // Procedures
        var procedures = await getProcedures(httpClient);
        await getProceduresDetails(httpClient, procedures);
        await saveProceduresToCsv(procedures);

        Console.WriteLine("Data gathering completed successfully.");
    }
}