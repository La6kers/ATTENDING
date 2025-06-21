using CsvHelper;
using System.Globalization;

namespace Attending.Presentation.DataGather.CMD.Services;
internal static class CsvPersistenceService
{
    public static async Task saveToCsv(IEnumerable<SymptomHttpResponseDto> symptoms)
    {
        if(symptoms is null || !symptoms.Any())
        {
            Console.WriteLine("No symptoms to save.");
            return;
        }

        var symptomDetailsDtos = symptoms.ToSymptomDetailsCsvDtos();
        if(!symptomDetailsDtos.Any())
        {
            Console.WriteLine("No symptom details to save.");
            return;
        }

        var csvFilePath = "symptoms.csv";
        using var writer = new StreamWriter(csvFilePath);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
        await csv.WriteRecordsAsync(symptomDetailsDtos);
        Console.WriteLine($"Symptoms saved to {csvFilePath}");
    }
    private static async Task saveExaminationsToCsv(IEnumerable<ExaminationHttpResponseDto> examinations)
    {
        if(examinations is null || !examinations.Any())
        {
            Console.WriteLine("No examinations to save.");
            return;
        }

        var examinationDetailsDtos = examinations.ToExaminationDetailsCsvDtos();
        if(!examinationDetailsDtos.Any())
        {
            Console.WriteLine("No examination details to save.");
            return;
        }

        var csvFilePath = "examinations.csv";
        using var writer = new StreamWriter(csvFilePath);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
        await csv.WriteRecordsAsync(examinationDetailsDtos);
        Console.WriteLine($"Examinations saved to {csvFilePath}");
    }
    private static async Task saveMedicationsToCsv(IEnumerable<MedicationHttpResponseDto> medications)
    {
        if(medications is null || !medications.Any())
        {
            Console.WriteLine("No medications to save.");
            return;
        }

        var medicationDetailsDtos = medications.ToMedicationDetailsCsvDtos();
        if(!medicationDetailsDtos.Any())
        {
            Console.WriteLine("No medication details to save.");
            return;
        }

        var csvFilePath = "medications.csv";
        using var writer = new StreamWriter(csvFilePath);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
        await csv.WriteRecordsAsync(medicationDetailsDtos);
        Console.WriteLine($"Medications saved to {csvFilePath}");
    }
    private static async Task saveProceduresToCsv(IEnumerable<ProcedureHttpResponseDto> procedures)
    {
        if(procedures is null || !procedures.Any())
        {
            Console.WriteLine("No procedures to save.");
            return;
        }

        var procedureDetailsDtos = procedures.ToProcedureDetailsCsvDtos();
        if(!procedureDetailsDtos.Any())
        {
            Console.WriteLine("No procedure details to save.");
            return;
        }

        var csvFilePath = "procedures.csv";
        using var writer = new StreamWriter(csvFilePath);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
        await csv.WriteRecordsAsync(procedureDetailsDtos);
        Console.WriteLine($"Procedures saved to {csvFilePath}");
    }

    private static IEnumerable<SymptomDetailCSVDto> ToCsvDtos(this IEnumerable<SymptomHttpResponseDto> symptoms)
    {
        ArgumentNullException.ThrowIfNull(symptoms, nameof(symptoms));
        return symptoms.SelectMany(symptom => symptom.Details.Select(detail =>
            new SymptomDetailCSVDto(SymptomName: symptom.Name, Title: detail.Title, Content: detail.Content)));
    }
    private static IEnumerable<ExaminationDetailCSVDto> ToCsvDtos(this IEnumerable<DataHttpResponseDto> examinations)
    {
        ArgumentNullException.ThrowIfNull(examinations, nameof(examinations));
        return examinations.SelectMany(exam => exam.Details.Select(detail =>
            new ExaminationDetailCSVDto(ExaminationName: exam.Name, Title: detail.Title, Content: detail.Content)));
    }
    private static IEnumerable<MedicationDetailCSVDto> ToMedicationDetailsCsvDtos(this IEnumerable<DataHttpResponseDto> medications)
    {
        ArgumentNullException.ThrowIfNull(medications, nameof(medications));
        return medications.SelectMany(med => med.Details.Select(detail =>
            new MedicationDetailCSVDto(MedicationName: med.Name, Title: detail.Title, Content: detail.Content)));
    }
    private static IEnumerable<ProcedureDetailCSVDto> ToProcedureDetailsCsvDtos(this IEnumerable<DataHttpResponseDto> procedures)
    {
        ArgumentNullException.ThrowIfNull(procedures, nameof(procedures));
        return procedures.SelectMany(proc => proc.Details.Select(detail =>
            new ProcedureDetailCSVDto(ProcedureName: proc.Name, Title: detail.Title, Content: detail.Content)));
    }


    private record SymptomDetailCSVDto(string SymptomName, string Title, string Content);
    private record ExaminationDetailCSVDto(string ExaminationName, string Title, string Content);
    private record MedicationDetailCSVDto(string MedicationName, string Title, string Content);
    private record ProcedureDetailCSVDto(string ProcedureName, string Title, string Content);
}
