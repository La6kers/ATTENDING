using HtmlAgilityPack;
using SharedKernel.Domain;

namespace Attending.Presentation.DataGather.CMD.Services;
internal static class FamilyPracticeNotebookScraperService
{

    public static class Symptoms
    {
        public static async Task<IEnumerable<Symptom>> Get()
        {
            var httpClient = new HttpClient
            {
                BaseAddress = new Uri(LinkUrls.BaseUrl)
            };
            var detailLinks = await getDetailsLinks(httpClient);
            if(!detailLinks.Any())
            {
                Console.WriteLine("No symptoms found.");
                return [];
            }

            var result = await Task.WhenAll(getDetailsTasks(httpClient, detailLinks));
            return result;
        }
        private static async Task<IEnumerable<DetailLinkDto>> getDetailsLinks(HttpClient httpClient)
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

            return linkNodes
                .Select(linkNode => new DetailLinkDto(
                    Name: linkNode.InnerText.Trim(),
                    Url: linkNode.GetAttributeValue("href", string.Empty)));
        }
        private static async Task<IEnumerable<Detail>> getDetails(HttpClient httpClient, DetailLinkDto detailLinkDto)
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

        private static IEnumerable<Task<Symptom>> getDetailsTasks(HttpClient httpClient, IEnumerable<DetailLinkDto> detailLinks)
        {
            using var semaphore = new SemaphoreSlim(Concurrency.SoftCap, Concurrency.HardCap);
            return detailLinks
                .Select(async detailLink =>
                {
                    await semaphore.WaitAsync();
                    try
                    {
                        var details = await getDetails(httpClient, detailLink);
                        return new Symptom(name: detailLink.Name, details: details);
                    }
                    finally
                    {
                        semaphore.Release();
                    }
                });
        }
    }

    private static class Examinations
    {
        public static async Task<IEnumerable<Examination>> Get(HttpClient httpClient)
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
        private static async Task getDetails(HttpClient httpClient, IEnumerable<DetailLinkDto> examinations)
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
                await getDetail(httpClient, examination);
            }
        }
        private static async Task getDetail(HttpClient httpClient, DetailLinkDto examination)
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
    }

    private static class Medications
    {
        public static async Task<List<Medication>> getMedications(HttpClient httpClient)
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
        private static async Task getMedicationsDetails(HttpClient httpClient, IEnumerable<DetailLinkDto> medications)
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
        private static async Task getMedicationDetail(HttpClient httpClient, DetailLinkDto medication)
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

    }

    private static class Procedures
    {
        public static async Task<List<ProcedureHttpResponseDto>> getProcedures(HttpClient httpClient)
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
        private static async Task getProceduresDetails(HttpClient httpClient, IEnumerable<DetailLinkDto> procedures)
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
        private static async Task getProcedureDetail(HttpClient httpClient, DetailLinkDto procedure)
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

    private record DetailLinkDto(string Name, string Url);
}
