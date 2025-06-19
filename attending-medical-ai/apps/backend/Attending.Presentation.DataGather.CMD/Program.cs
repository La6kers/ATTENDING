using Attending.Presentation.DataGather.CMD.Sources.FamilyPracticeNoteBook;

namespace Attending.Presentation.DataGather.CMD;

internal static class Program
{
    static async Task Main(string[] args)
    {
        await getDataFromFamilyPracticeNoteBook();
        Console.WriteLine("Data gathering completed successfully.");
    }

    private static async Task getDataFromFamilyPracticeNoteBook()
    {
        var symptoms = await FamilyPracticeNotebookScraperService.GetSymptoms();
        if(symptoms.Any())
            await CsvPersistenceService.saveToCsv(symptoms, "Symptoms");
        else
            Console.WriteLine("No symptoms found.");


        var examinations = await FamilyPracticeNotebookScraperService.GetExaminations();
        if(examinations.Any())
            await CsvPersistenceService.saveToCsv(examinations, "Examinations");
        else
            Console.WriteLine("No examinations found.");

        var medications = await FamilyPracticeNotebookScraperService.GetMedications();
        if(medications.Any())
            await CsvPersistenceService.saveToCsv(medications, "Medications");
        else
            Console.WriteLine("No medications found.");

        var procedures = await FamilyPracticeNotebookScraperService.GetProcedures();
        if(procedures.Any())
            await CsvPersistenceService.saveToCsv(procedures, "Procedures");
        else
            Console.WriteLine("No procedures found.");
    }
}