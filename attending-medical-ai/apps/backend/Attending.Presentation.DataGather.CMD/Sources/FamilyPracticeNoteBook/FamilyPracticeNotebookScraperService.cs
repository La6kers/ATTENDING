using HtmlAgilityPack;
using SharedKernel.Domain;

namespace Attending.Presentation.DataGather.CMD.Sources.FamilyPracticeNoteBook;
internal static class FamilyPracticeNotebookScraperService
{
    public static async Task<IEnumerable<Symptom>> GetSymptoms() => await get<Symptom>($"{LinkUrls.BaseUrl}/{LinkUrls.Symptoms}");
    public static async Task<IEnumerable<Examination>> GetExaminations() => await get<Examination>($"{LinkUrls.BaseUrl}/{LinkUrls.Examinations}");
    public static async Task<IEnumerable<Medication>> GetMedications() => await get<Medication>($"{LinkUrls.BaseUrl}/{LinkUrls.Medications}");
    public static async Task<IEnumerable<Procedure>> GetProcedures() => await get<Procedure>($"{LinkUrls.BaseUrl}/{LinkUrls.Procedures}");


    private static async Task<IEnumerable<T>> get<T>(string dataUrl) where T : Data, new()
    {
        var httpClient = new HttpClient()
        {
            BaseAddress = new Uri(LinkUrls.HomeUrl)
        };
        var detailLinks = await getDataWithDetailsLinks(httpClient, dataUrl);
        if(!detailLinks.Any())
        {
            Console.WriteLine("No Data found.");
            return [];
        }

        using var semaphoreSlim = new SemaphoreSlim(Concurrency.MaxDop);
        var result = await Task.WhenAll(getDetailsTasks<T>(httpClient, detailLinks, semaphoreSlim));
        return result;
    }
    private static IEnumerable<Task<T>> getDetailsTasks<T>(HttpClient httpClient, IEnumerable<DataWithDetailsLinkDto> detailLinks, SemaphoreSlim semaphoreSlim) where T : Data, new()
    {
        return detailLinks
            .Select(async detailLink =>
            {
                await semaphoreSlim.WaitAsync();
                try
                {
                    var details = await getDetails(httpClient, detailLink);
                    var result = new T();

                    result.SetName(detailLink.Name);
                    result.Details.AddRange(details ?? []);

                    return result;
                }
                finally
                {
                    semaphoreSlim.Release();
                }
            });
    }
    private static async Task<IEnumerable<DataWithDetailsLinkDto>> getDataWithDetailsLinks(HttpClient httpClient, string dataUrl)
    {
        var response = await httpClient.GetAsync(dataUrl);
        if(!response.IsSuccessStatusCode)
        {
            Console.WriteLine("Failed to fetch detail links content.");
            return [];
        }

        var html = await response.Content.ReadAsStringAsync();
        var document = new HtmlDocument();
        document.LoadHtml(html);

        var linkNodes = document.DocumentNode.SelectNodes("//li/a[@href]");
        if(linkNodes is null)
        {
            Console.WriteLine("No details found.");
            return [];
        }

        return linkNodes
            .Select(linkNode => new DataWithDetailsLinkDto(
                Name: linkNode.InnerText.Trim(),
                Url: linkNode.GetAttributeValue("href", string.Empty)));
    }
    private static async Task<IEnumerable<Detail>> getDetails(HttpClient httpClient, DataWithDetailsLinkDto detailLinkDto)
    {
        if(detailLinkDto is null || string.IsNullOrEmpty(detailLinkDto.Name) || string.IsNullOrEmpty(detailLinkDto.Url))
        {
            Console.WriteLine("Invalid Symptom name or URL provided.");
            return [];
        }

        var response = await httpClient.GetAsync(detailLinkDto.Url);
        if(!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"Failed to fetch data from {detailLinkDto.Url}.");
            return [];
        }

        var htmlString = await response.Content.ReadAsStringAsync();
        var htmlDocument = new HtmlDocument();
        htmlDocument.LoadHtml(htmlString);

        var detailNodes = htmlDocument.DocumentNode.Descendants("div")
            .Where(node => node.GetClasses().Contains("page-block")
                && node.GetClasses().Contains("fpnContent-page-block"));

        if(detailNodes is null)
        {
            Console.WriteLine("No detail nodes found.");
            return [];
        }

        List<Detail> details = [];
        foreach(var detailNode in detailNodes)
        {
            var titleNode = detailNode.ChildNodes.FirstOrDefault(node => node.HasClass("page-block-title"));
            var contentNode = detailNode.ChildNodes.FirstOrDefault(node => node.HasClass("page-block-body"));
            if(titleNode != null && contentNode != null)
                details.Add(new Detail(name: titleNode.InnerText.Trim(), content: contentNode.InnerText.Trim()));
        }

        return details;
    }

    private static class LinkUrls
    {
        public const string HomeUrl = "https://fpnotebook.com";
        public const string BaseUrl = "https://fpnimages.blob.core.windows.net/$web/indexIncludes";
        public const string Symptoms = "Sx.htm";
        public const string Examinations = "Exam.htm";
        public const string Medications = "Pharm.htm";
        public const string Procedures = "Procedure.htm";
    }

    private record DataWithDetailsLinkDto(string Name, string Url);
}
