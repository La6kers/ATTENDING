using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using ATTENDING.Infrastructure.Data;
using Xunit;

namespace ATTENDING.Integration.Tests.Infrastructure;

public class DatabaseInitializerTests
{
    private static (IServiceProvider provider, IHostEnvironment env) CreateTestServices(string environmentName = "Testing")
    {
        var services = new ServiceCollection();
        var dbName = Guid.NewGuid().ToString();
        services.AddDbContext<AttendingDbContext>(opt =>
            opt.UseInMemoryDatabase(dbName));
        services.AddLogging(b => b.AddConsole());

        var envMock = new Mock<IHostEnvironment>();
        envMock.Setup(e => e.EnvironmentName).Returns(environmentName);

        return (services.BuildServiceProvider(), envMock.Object);
    }

    [Fact]
    public async Task Initialize_ShouldSeedUsers()
    {
        var (sp, env) = CreateTestServices();
        await DatabaseInitializer.InitializeAsync(sp, env);

        using var scope = sp.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AttendingDbContext>();
        var users = await ctx.Users.ToListAsync();
        users.Should().HaveCount(3);
        users.Should().Contain(u => u.Email == "scott.isbell@attending.ai");
        users.Should().Contain(u => u.Email == "jane.martinez@attending.ai");
        users.Should().Contain(u => u.Email == "admin@attending.ai");
    }

    [Fact]
    public async Task Initialize_ShouldSeedPatients()
    {
        var (sp, env) = CreateTestServices();
        await DatabaseInitializer.InitializeAsync(sp, env);

        using var scope = sp.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AttendingDbContext>();
        var patients = await ctx.Patients.ToListAsync();
        patients.Should().HaveCount(5);
        patients.First().Should().NotBeNull();
    }

    [Fact]
    public async Task Initialize_ShouldSeedEncounters()
    {
        var (sp, env) = CreateTestServices();
        await DatabaseInitializer.InitializeAsync(sp, env);

        using var scope = sp.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AttendingDbContext>();
        var encounters = await ctx.Encounters.ToListAsync();
        encounters.Should().HaveCount(5);
    }

    [Fact]
    public async Task Initialize_ShouldSeedAllergiesAndConditions()
    {
        var (sp, env) = CreateTestServices();
        await DatabaseInitializer.InitializeAsync(sp, env);

        using var scope = sp.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AttendingDbContext>();
        var allergies = await ctx.Allergies.ToListAsync();
        var conditions = await ctx.MedicalConditions.ToListAsync();
        allergies.Should().HaveCount(4);
        conditions.Should().HaveCount(8);
    }

    [Fact]
    public async Task Initialize_RunTwice_ShouldBeIdempotent()
    {
        var (sp, env) = CreateTestServices();
        await DatabaseInitializer.InitializeAsync(sp, env);
        await DatabaseInitializer.InitializeAsync(sp, env);

        using var scope = sp.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AttendingDbContext>();
        var users = await ctx.Users.ToListAsync();
        users.Should().HaveCount(3, "seeding twice should not duplicate data");
    }

    [Fact]
    public async Task Initialize_ProductionEnv_ShouldNotSeed()
    {
        var (sp, env) = CreateTestServices("Production");
        await DatabaseInitializer.InitializeAsync(sp, env);

        using var scope = sp.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AttendingDbContext>();
        var users = await ctx.Users.ToListAsync();
        users.Should().BeEmpty("production environment should not seed dev data");
    }
}
