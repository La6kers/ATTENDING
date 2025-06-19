using CsvHelper;
using HtmlAgilityPack;
using System.Globalization;

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

    // SYMPTOMS
    private static async Task<List<SymptomHttpResponseDto>> getSymptoms(HttpClient httpClient)
    {
        var response = await httpClient.GetAsync(LinkUrls.Symptoms);
        if(!response.IsSuccessStatusCode)
        {
            Console.WriteLine("Failed to fetch symptoms content.");
            return [];
        }

        var html = await response.Content.ReadAsStringAsync();
        var document = new HtmlDocument();
        document.LoadHtml(html);

        var linkNodes = document.DocumentNode.SelectNodes("//li/a[@href]");
        if(linkNodes is null)
        {
            Console.WriteLine("No Symptoms found.");
            return [];
        }

        List<SymptomHttpResponseDto> symptoms = [];
        foreach(var linkNode in linkNodes)
            symptoms.Add(new(Name: linkNode.InnerText.Trim(), Url: linkNode.GetAttributeValue("href", string.Empty)));
        return symptoms;
    }

    private static async Task getSymptomsDetails(HttpClient httpClient, IEnumerable<SymptomHttpResponseDto> symptoms)
    {
        if(symptoms is null || !symptoms.Any())
        {
            Console.WriteLine("No symptoms found.");
            return;
        }

        foreach(var symptom in symptoms)
        {
            if(string.IsNullOrEmpty(symptom.Url))
            {
                Console.WriteLine($"Invalid URL for symptom: {symptom.Name}");
                continue;
            }
            await getSymptomDetail(httpClient, symptom);
        }
    }

    private static async Task getSymptomDetail(HttpClient httpClient, SymptomHttpResponseDto symptom)
    {
        if(symptom is null || string.IsNullOrEmpty(symptom.Url) || string.IsNullOrEmpty(symptom.Name))
        {
            Console.WriteLine("Invalid URL or Symptom name provided.");
            return;
        }

        var response = await httpClient.GetAsync(symptom.Url);
        if(!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"Failed to fetch data from {symptom.Url}.");
            return;
        }

        var html = await response.Content.ReadAsStringAsync();
        var document = new HtmlDocument();
        document.LoadHtml(html);

        var detailNodes = document.DocumentNode.Descendants("div")
            .Where(node => node.GetClasses().Contains("page-block")
                && node.GetClasses().Contains("fpnContent-page-block"));

        if(detailNodes is null)
        {
            Console.WriteLine("No detail nodes found.");
            return;
        }

        foreach(var detailNode in detailNodes)
        {
            var titleNode = detailNode.ChildNodes.FirstOrDefault(node => node.HasClass("page-block-title"));
            var contentNode = detailNode.ChildNodes.FirstOrDefault(node => node.HasClass("page-block-body"));
            if(titleNode != null && contentNode != null)
                symptom.Details.Add(new SymptomDetailDto(Title: titleNode.InnerText.Trim(), Content: contentNode.InnerText.Trim()));
        }
    }

    private static IEnumerable<SymptomDetailCSVDto> ToSymptomDetailsCsvDtos(this IEnumerable<SymptomHttpResponseDto> symptoms)
    {
        ArgumentNullException.ThrowIfNull(symptoms, nameof(symptoms));
        return symptoms.SelectMany(symptom => symptom.Details.Select(detail =>
            new SymptomDetailCSVDto(SymptomName: symptom.Name, Title: detail.Title, Content: detail.Content)));
    }

    private static async Task saveSymptomsToCsv(IEnumerable<SymptomHttpResponseDto> symptoms)
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

    // EXAMINATIONS
    private static async Task<List<ExaminationHttpResponseDto>> getExaminations(HttpClient httpClient)
    {
        var response = await httpClient.GetAsync(LinkUrls.Examinations);
        if(!response.IsSuccessStatusCode)
        {
            Console.WriteLine("Failed to fetch examinations content.");
            return [];
        }

        var html = await response.Content.ReadAsStringAsync();
        var document = new HtmlDocument();
        document.LoadHtml(html);

        var linkNodes = document.DocumentNode.SelectNodes("//li/a[@href]");
        if(linkNodes is null)
        {
            Console.WriteLine("No Examinations found.");
            return [];
        }

        List<ExaminationHttpResponseDto> examinations = [];
        foreach(var linkNode in linkNodes)
            examinations.Add(new(Name: linkNode.InnerText.Trim(), Url: linkNode.GetAttributeValue("href", string.Empty)));
        return examinations;
    }

    private static async Task getExaminationsDetails(HttpClient httpClient, IEnumerable<ExaminationHttpResponseDto> examinations)
    {
        if(examinations is null || !examinations.Any())
        {
            Console.WriteLine("No examinations found.");
            return;
        }

        foreach(var examination in examinations)
        {
            if(string.IsNullOrEmpty(examination.Url))
            {
                Console.WriteLine($"Invalid URL for examination: {examination.Name}");
                continue;
            }
            await getExaminationDetail(httpClient, examination);
        }
    }

    private static async Task getExaminationDetail(HttpClient httpClient, ExaminationHttpResponseDto examination)
    {
        if(examination is null || string.IsNullOrEmpty(examination.Url) || string.IsNullOrEmpty(examination.Name))
        {
            Console.WriteLine("Invalid URL or Examination name provided.");
            return;
        }

        var response = await httpClient.GetAsync(examination.Url);
        if(!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"Failed to fetch data from {examination.Url}.");
            return;
        }

        var html = await response.Content.ReadAsStringAsync();
        var document = new HtmlDocument();
        document.LoadHtml(html);

        var detailNodes = document.DocumentNode.Descendants("div")
            .Where(node => node.GetClasses().Contains("page-block")
                && node.GetClasses().Contains("fpnContent-page-block"));

        if(detailNodes is null)
        {
            Console.WriteLine("No detail nodes found.");
            return;
        }

        foreach(var detailNode in detailNodes)
        {
            var titleNode = detailNode.ChildNodes.FirstOrDefault(node => node.HasClass("page-block-title"));
            var contentNode = detailNode.ChildNodes.FirstOrDefault(node => node.HasClass("page-block-body"));
            if(titleNode != null && contentNode != null)
                examination.Details.Add(new ExaminationDetailDto(Title: titleNode.InnerText.Trim(), Content: contentNode.InnerText.Trim()));
        }
    }

    private static IEnumerable<ExaminationDetailCSVDto> ToExaminationDetailsCsvDtos(this IEnumerable<ExaminationHttpResponseDto> examinations)
    {
        ArgumentNullException.ThrowIfNull(examinations, nameof(examinations));
        return examinations.SelectMany(exam => exam.Details.Select(detail =>
            new ExaminationDetailCSVDto(ExaminationName: exam.Name, Title: detail.Title, Content: detail.Content)));
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

    // MEDICATIONS
    private static async Task<List<MedicationHttpResponseDto>> getMedications(HttpClient httpClient)
    {
        var response = await httpClient.GetAsync(LinkUrls.Medications);
        if(!response.IsSuccessStatusCode)
        {
            Console.WriteLine("Failed to fetch medications content.");
            return [];
        }

        var html = await response.Content.ReadAsStringAsync();
        var document = new HtmlDocument();
        document.LoadHtml(html);

        var linkNodes = document.DocumentNode.SelectNodes("//li/a[@href]");
        if(linkNodes is null)
        {
            Console.WriteLine("No Medications found.");
            return [];
        }

        List<MedicationHttpResponseDto> medications = [];
        foreach(var linkNode in linkNodes)
            medications.Add(new(Name: linkNode.InnerText.Trim(), Url: linkNode.GetAttributeValue("href", string.Empty)));
        return medications;
    }

    private static async Task getMedicationsDetails(HttpClient httpClient, IEnumerable<MedicationHttpResponseDto> medications)
    {
        if(medications is null || !medications.Any())
        {
            Console.WriteLine("No medications found.");
            return;
        }

        foreach(var medication in medications)
        {
            if(string.IsNullOrEmpty(medication.Url))
            {
                Console.WriteLine($"Invalid URL for medication: {medication.Name}");
                continue;
            }
            await getMedicationDetail(httpClient, medication);
        }
    }

    private static async Task getMedicationDetail(HttpClient httpClient, MedicationHttpResponseDto medication)
    {
        if(medication is null || string.IsNullOrEmpty(medication.Url) || string.IsNullOrEmpty(medication.Name))
        {
            Console.WriteLine("Invalid URL or Medication name provided.");
            return;
        }

        var response = await httpClient.GetAsync(medication.Url);
        if(!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"Failed to fetch data from {medication.Url}.");
            return;
        }

        var html = await response.Content.ReadAsStringAsync();
        var document = new HtmlDocument();
        document.LoadHtml(html);

        var detailNodes = document.DocumentNode.Descendants("div")
            .Where(node => node.GetClasses().Contains("page-block")
                && node.GetClasses().Contains("fpnContent-page-block"));

        if(detailNodes is null)
        {
            Console.WriteLine("No detail nodes found.");
            return;
        }

        foreach(var detailNode in detailNodes)
        {
            var titleNode = detailNode.ChildNodes.FirstOrDefault(node => node.HasClass("page-block-title"));
            var contentNode = detailNode.ChildNodes.FirstOrDefault(node => node.HasClass("page-block-body"));
            if(titleNode != null && contentNode != null)
                medication.Details.Add(new MedicationDetailDto(Title: titleNode.InnerText.Trim(), Content: contentNode.InnerText.Trim()));
        }
    }

    private static IEnumerable<MedicationDetailCSVDto> ToMedicationDetailsCsvDtos(this IEnumerable<MedicationHttpResponseDto> medications)
    {
        ArgumentNullException.ThrowIfNull(medications, nameof(medications));
        return medications.SelectMany(med => med.Details.Select(detail =>
            new MedicationDetailCSVDto(MedicationName: med.Name, Title: detail.Title, Content: detail.Content)));
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

    // PROCEDURES
    private static async Task<List<ProcedureHttpResponseDto>> getProcedures(HttpClient httpClient)
    {
        var response = await httpClient.GetAsync(LinkUrls.Procedures);
        if(!response.IsSuccessStatusCode)
        {
            Console.WriteLine("Failed to fetch procedures content.");
            return [];
        }

        var html = await response.Content.ReadAsStringAsync();
        var document = new HtmlDocument();
        document.LoadHtml(html);

        var linkNodes = document.DocumentNode.SelectNodes("//li/a[@href]");
        if(linkNodes is null)
        {
            Console.WriteLine("No Procedures found.");
            return [];
        }

        List<ProcedureHttpResponseDto> procedures = [];
        foreach(var linkNode in linkNodes)
            procedures.Add(new(Name: linkNode.InnerText.Trim(), Url: linkNode.GetAttributeValue("href", string.Empty)));
        return procedures;
    }

    private static async Task getProceduresDetails(HttpClient httpClient, IEnumerable<ProcedureHttpResponseDto> procedures)
    {
        if(procedures is null || !procedures.Any())
        {
            Console.WriteLine("No procedures found.");
            return;
        }

        foreach(var procedure in procedures)
        {
            if(string.IsNullOrEmpty(procedure.Url))
            {
                Console.WriteLine($"Invalid URL for procedure: {procedure.Name}");
                continue;
            }
            await getProcedureDetail(httpClient, procedure);
        }
    }

    private static async Task getProcedureDetail(HttpClient httpClient, ProcedureHttpResponseDto procedure)
    {
        if(procedure is null || string.IsNullOrEmpty(procedure.Url) || string.IsNullOrEmpty(procedure.Name))
        {
            Console.WriteLine("Invalid URL or Procedure name provided.");
            return;
        }

        var response = await httpClient.GetAsync(procedure.Url);
        if(!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"Failed to fetch data from {procedure.Url}.");
            return;
        }

        var html = await response.Content.ReadAsStringAsync();
        var document = new HtmlDocument();
        document.LoadHtml(html);

        var detailNodes = document.DocumentNode.Descendants("div")
            .Where(node => node.GetClasses().Contains("page-block")
                && node.GetClasses().Contains("fpnContent-page-block"));

        if(detailNodes is null)
        {
            Console.WriteLine("No detail nodes found.");
            return;
        }

        foreach(var detailNode in detailNodes)
        {
            var titleNode = detailNode.ChildNodes.FirstOrDefault(node => node.HasClass("page-block-title"));
            var contentNode = detailNode.ChildNodes.FirstOrDefault(node => node.HasClass("page-block-body"));
            if(titleNode != null && contentNode != null)
                procedure.Details.Add(new ProcedureDetailDto(Title: titleNode.InnerText.Trim(), Content: contentNode.InnerText.Trim()));
        }
    }

    private static IEnumerable<ProcedureDetailCSVDto> ToProcedureDetailsCsvDtos(this IEnumerable<ProcedureHttpResponseDto> procedures)
    {
        ArgumentNullException.ThrowIfNull(procedures, nameof(procedures));
        return procedures.SelectMany(proc => proc.Details.Select(detail =>
            new ProcedureDetailCSVDto(ProcedureName: proc.Name, Title: detail.Title, Content: detail.Content)));
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

    private static class LinkUrls
    {
        public const string Symptoms = "https://fpnimages.blob.core.windows.net/$web/indexIncludes/Sx.htm";
        public const string Examinations = "https://fpnimages.blob.core.windows.net/$web/indexIncludes/Exam.htm";
        public const string Medications = "https://fpnimages.blob.core.windows.net/$web/indexIncludes/Pharm.htm";
        public const string Procedures = "https://fpnimages.blob.core.windows.net/$web/indexIncludes/Procedure.htm";
    }

    // Symptoms
    private record SymptomHttpResponseDto(string Name, string Url)
    {
        public string Name { get; } = Name;
        public string Url { get; } = Url;
        public List<SymptomDetailDto> Details { get; } = [];
    }
    private record SymptomDetailDto(string Title, string Content);
    private record SymptomDetailCSVDto(string SymptomName, string Title, string Content);

    // Examinations
    private record ExaminationHttpResponseDto(string Name, string Url)
    {
        public string Name { get; } = Name;
        public string Url { get; } = Url;
        public List<ExaminationDetailDto> Details { get; } = [];
    }
    private record ExaminationDetailDto(string Title, string Content);
    private record ExaminationDetailCSVDto(string ExaminationName, string Title, string Content);

    // Medications
    private record MedicationHttpResponseDto(string Name, string Url)
    {
        public string Name { get; } = Name;
        public string Url { get; } = Url;
        public List<MedicationDetailDto> Details { get; } = [];
    }
    private record MedicationDetailDto(string Title, string Content);
    private record MedicationDetailCSVDto(string MedicationName, string Title, string Content);

    // Procedures
    private record ProcedureHttpResponseDto(string Name, string Url)
    {
        public string Name { get; } = Name;
        public string Url { get; } = Url;
        public List<ProcedureDetailDto> Details { get; } = [];
    }
    private record ProcedureDetailDto(string Title, string Content);
    private record ProcedureDetailCSVDto(string ProcedureName, string Title, string Content);
}