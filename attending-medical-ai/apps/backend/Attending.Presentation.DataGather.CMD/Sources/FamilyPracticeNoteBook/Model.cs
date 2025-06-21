namespace Attending.Presentation.DataGather.CMD.Sources.FamilyPracticeNoteBook;

public class Symptom(string name) : Data(name)
{
    public Symptom() : this(string.Empty)
    {
    }
}

public class Examination(string name) : Data(name)
{
    public Examination() : this(string.Empty)
    {
    }
}

public class Medication(string name) : Data(name)
{
    public Medication() : this(string.Empty)
    {
    }
}

public class Procedure(string name) : Data(name)
{
    public Procedure() : this(string.Empty)
    {
    }
}

public abstract class Data(string name)
{
    public string Name { get; private set; } = string.IsNullOrWhiteSpace(name) ? string.Empty : name;
    public List<Detail> Details { get; private set; } = [];

    public Data() : this(string.Empty)
    {
    }

    public void SetName(string name)
    {
        if(string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name cannot be null or empty.", nameof(name));
        Name = name;
    }
}

public class Detail(string name, string content)
{
    public string Name { get; set; } = name;
    public string Content { get; set; } = content;
}