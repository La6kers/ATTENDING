namespace SharedKernel.Domain;
public static class Concurrency
{
    /// <summary>
    /// Represents a dynamic concurrency limit based on available thread pool resources.
    /// </summary>
    public static int SoftCap => getMaxDopSoftCap();
    /// <summary>
    /// Represents a static, CPU-based upper bound for concurrency.
    /// </summary>
    public static int HardCap => getMaxDopHardCap();
    /// <summary>
    /// Determines the effective Max Degree of Parallelism (MaxDop), considering configuration, SoftCap, and HardCap.
    /// </summary>
    public static int MaxDop => calculateMaxDop();

    private static int calculateMaxDop()
    {
        if(int.TryParse(Environment.GetEnvironmentVariable("Concurrency__MaxDop"), out var MaxDop))
            return Math.Max(1, MaxDop);

        return Math.Max(1, Math.Min(SoftCap, HardCap));
    }

    private static int getMaxDopSoftCap()
    {
        ThreadPool.GetAvailableThreads(out int workerThreads, out _);
        return workerThreads / 2;
    }

    private static int getMaxDopHardCap() => Environment.ProcessorCount * 2;
}