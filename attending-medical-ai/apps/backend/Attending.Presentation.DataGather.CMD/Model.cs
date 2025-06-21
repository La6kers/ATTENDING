namespace Attending.Presentation.DataGather.CMD;

public class Symptom(string name, IEnumerable<Detail> details)
{
    public string Name { get; set; } = name;
    public List<Detail> Details { get; } = details.ToList() ?? [];
}

public class Examination(string name, IEnumerable<Detail> details)
{
    public string Name { get; } = name;
    public List<Detail> Details { get; } = details.ToList() ?? [];
}

public class MedicationDetail(string name, IEnumerable<Detail> details)
{
    public string Name { get; } = name;
    public List<Detail> Details { get; } = details.ToList() ?? [];

}

public class ProcedureDetail(string name, IEnumerable<Detail> details)
{
    public string Name { get; } = name;
    public List<Detail> Details { get; } = details.ToList() ?? [];

}

public class Detail(string name, string content)
{
    public string Name { get; set; } = name;
    public string Content { get; set; } = content;
}