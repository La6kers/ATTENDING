using System.Text;

namespace SharedKernel;

public class ObservableStringBuilder() : IDisposable
{
    public event EventHandler<(string AppendedString, string FullString)>? Appended;
    private readonly StringBuilder _stringBuilder = new();
    private readonly SemaphoreSlim _semaphore = new(1, 1);

    public void Append(string value)
    {
        _semaphore.Wait();
        try
        {
            _stringBuilder.Append(value);
            Appended?.Invoke(this, new(value, _stringBuilder.ToString()));
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public override string ToString()
    {
        _semaphore.Wait();
        try
        {
            return _stringBuilder.ToString();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public void Dispose()
    {
        _semaphore.Dispose();
        _stringBuilder.Clear();
        Appended = null;
    }
}
