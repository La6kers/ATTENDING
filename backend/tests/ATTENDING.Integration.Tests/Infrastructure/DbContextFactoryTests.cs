using FluentAssertions;
using ATTENDING.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Xunit;

namespace ATTENDING.Integration.Tests.Infrastructure;

public class DbContextFactoryTests
{
    [Fact]
    public void DesignTimeFactory_ShouldImplementInterface()
    {
        typeof(AttendingDbContextFactory)
            .Should().Implement<IDesignTimeDbContextFactory<AttendingDbContext>>();
    }

    [Fact]
    public void DbContext_ShouldConfigureDefaultSchema()
    {
        var options = new DbContextOptionsBuilder<AttendingDbContext>()
            .UseInMemoryDatabase("schema-test")
            .Options;

        using var context = new AttendingDbContext(options);
        var model = context.Model;

        model.FindEntityType(typeof(ATTENDING.Domain.Entities.Patient))
            .Should().NotBeNull();
        model.FindEntityType(typeof(ATTENDING.Domain.Entities.LabOrder))
            .Should().NotBeNull();
        model.FindEntityType(typeof(ATTENDING.Domain.Entities.AiFeedback))
            .Should().NotBeNull();
    }

    [Fact]
    public void DbContext_ShouldHaveAllDbSets()
    {
        var options = new DbContextOptionsBuilder<AttendingDbContext>()
            .UseInMemoryDatabase("dbset-test")
            .Options;

        using var context = new AttendingDbContext(options);

        context.Patients.Should().NotBeNull();
        context.Encounters.Should().NotBeNull();
        context.LabOrders.Should().NotBeNull();
        context.ImagingOrders.Should().NotBeNull();
        context.MedicationOrders.Should().NotBeNull();
        context.Referrals.Should().NotBeNull();
        context.Assessments.Should().NotBeNull();
        context.AiFeedback.Should().NotBeNull();
        context.AuditLogs.Should().NotBeNull();
    }
}
