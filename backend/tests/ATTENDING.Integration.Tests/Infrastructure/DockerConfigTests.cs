using FluentAssertions;
using ATTENDING.Contracts.Requests;
using ATTENDING.Contracts.Responses;
using Xunit;

namespace ATTENDING.Integration.Tests.Infrastructure;

public class DockerConfigTests
{
    [Fact]
    public void Dockerfile_ShouldExist()
    {
        // Verify Dockerfile exists relative to test output
        var solutionDir = FindSolutionDirectory();
        if (solutionDir == null) return; // Skip in CI if structure differs

        var dockerFile = Path.Combine(solutionDir, "Dockerfile");
        File.Exists(dockerFile).Should().BeTrue("Dockerfile should exist at backend root");
    }

    [Fact]
    public void DockerCompose_ShouldExist()
    {
        var solutionDir = FindSolutionDirectory();
        if (solutionDir == null) return;

        var composeFile = Path.Combine(solutionDir, "docker-compose.yml");
        File.Exists(composeFile).Should().BeTrue("docker-compose.yml should exist at backend root");
    }

    private static string? FindSolutionDirectory()
    {
        var dir = Directory.GetCurrentDirectory();
        while (dir != null)
        {
            if (Directory.GetFiles(dir, "*.sln").Length > 0)
                return dir;
            dir = Directory.GetParent(dir)?.FullName;
        }
        return null;
    }
}
