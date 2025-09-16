namespace Orchestration.AppHost.Builds;
internal static class Local
{
    public static IDistributedApplicationBuilder? Build(IDistributedApplicationBuilder? builder)
    {
        if(builder is null)
            return null;

        

        return builder;
    }
}
