using CsvHelper;
using System.Globalization;

namespace Attending.Presentation.DataGather.CMD.Sources.FamilyPracticeNoteBook;
internal static class CsvPersistenceService
{
    public static async Task saveToCsv<T>(IEnumerable<T> data, string fileName) where T : Data
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fileName, nameof(fileName));
        if(data is null || !data.Any())
        {
            Console.WriteLine("No data to save.");
            return;
        }

        var csvDtos = data.ToCsvDtos();
        if(!csvDtos.Any())
        {
            Console.WriteLine("Failed to parse data into CSV format.");
            return;
        }

        var csvFilePath = $"{fileName}.csv";
        using var writer = new StreamWriter(csvFilePath);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
        await csv.WriteRecordsAsync(csvDtos);
        Console.WriteLine($"Data saved to {csvFilePath}");
    }

    private static IEnumerable<CSVDto> ToCsvDtos<T>(this IEnumerable<T> data) where T : Data
    {
        ArgumentNullException.ThrowIfNull(data, nameof(data));
        return data.SelectMany(d => d.Details.Select(detail =>
            new CSVDto(Name: d.Name, Title: detail.Name, Content: detail.Content)));

    }

    private record CSVDto(string Name, string Title, string Content);
}
