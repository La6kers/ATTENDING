using FluentAssertions;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Commands.Patients;
using ATTENDING.Application.Queries.Patients;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using Moq;
using Xunit;

// ReSharper disable once CheckNamespace

namespace ATTENDING.Integration.Tests.Handlers;

public class PatientHandlerTests
{
    private static readonly Guid TestTenantId = new("00000000-0000-0000-0000-000000000001");
    private readonly Mock<IPatientRepository> _repoMock = new();
    private readonly Mock<IUnitOfWork> _uowMock = new();
    private readonly Mock<ILogger<CreatePatientHandler>> _loggerMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();

    public PatientHandlerTests()
    {
        // Default: authenticated tenant for all tests
        _currentUserMock.Setup(s => s.TenantId).Returns(TestTenantId);
        _currentUserMock.Setup(s => s.IsAuthenticated).Returns(true);
    }

    [Fact]
    public async Task CreatePatient_ValidInput_ShouldSucceed()
    {
        _repoMock.Setup(r => r.GetByMrnAsync(It.IsAny<string>(), default)).ReturnsAsync((Patient?)null);
        var handler = new CreatePatientHandler(_repoMock.Object, _uowMock.Object, _loggerMock.Object, _currentUserMock.Object);

        var result = await handler.Handle(new CreatePatientCommand(
            "MRN-12345", "John", "Doe", new DateTime(1985, 3, 15), "Male",
            "555-1234", "john@test.com", null, null, null, null, "English"), default);

        result.IsSuccess.Should().BeTrue();
        result.Value.PatientId.Should().NotBeEmpty();
        result.Value.MRN.Should().Be("MRN-12345");
    }

    [Fact]
    public async Task CreatePatient_DuplicateMRN_ShouldFail()
    {
        var existing = Patient.Create(TestTenantId, "MRN-12345", "Jane", "Doe", new DateTime(1990, 1, 1), BiologicalSex.Female);
        _repoMock.Setup(r => r.GetByMrnAsync("MRN-12345", default)).ReturnsAsync(existing);
        var handler = new CreatePatientHandler(_repoMock.Object, _uowMock.Object, _loggerMock.Object, _currentUserMock.Object);

        var result = await handler.Handle(new CreatePatientCommand(
            "MRN-12345", "John", "Doe", new DateTime(1985, 3, 15), "Male",
            null, null, null, null, null, null, "English"), default);

        result.IsFailure.Should().BeTrue();
        result.Error.Message.Should().Contain("already exists");
    }

    [Fact]
    public async Task AddAllergy_ValidInput_ShouldSucceed()
    {
        var patient = Patient.Create(TestTenantId, "MRN-001", "Test", "Patient", DateTime.Today.AddYears(-30), BiologicalSex.Male);
        _repoMock.Setup(r => r.GetWithAllergiesAsync(patient.Id, default)).ReturnsAsync(patient);

        var handler = new AddAllergyHandler(_repoMock.Object, _uowMock.Object);
        var result = await handler.Handle(new AddAllergyCommand(
            patient.Id, "Penicillin", AllergySeverity.Severe, "Anaphylaxis"), default);

        result.IsSuccess.Should().BeTrue();
        patient.Allergies.Should().HaveCount(1);
    }

    [Fact]
    public async Task AddAllergy_PatientNotFound_ShouldFail()
    {
        _repoMock.Setup(r => r.GetWithAllergiesAsync(It.IsAny<Guid>(), default)).ReturnsAsync((Patient?)null);
        var handler = new AddAllergyHandler(_repoMock.Object, _uowMock.Object);

        var result = await handler.Handle(new AddAllergyCommand(
            Guid.NewGuid(), "Penicillin", AllergySeverity.Mild, null), default);

        result.IsFailure.Should().BeTrue();
    }

    [Fact]
    public async Task AddCondition_ValidInput_ShouldSucceed()
    {
        var patient = Patient.Create(TestTenantId, "MRN-002", "Test", "Patient", DateTime.Today.AddYears(-40), BiologicalSex.Female);
        _repoMock.Setup(r => r.GetWithConditionsAsync(patient.Id, default)).ReturnsAsync(patient);

        var handler = new AddConditionHandler(_repoMock.Object, _uowMock.Object);
        var result = await handler.Handle(new AddConditionCommand(
            patient.Id, "E11.9", "Type 2 Diabetes", new DateTime(2020, 6, 1)), default);

        result.IsSuccess.Should().BeTrue();
        patient.Conditions.Should().HaveCount(1);
    }

    [Fact]
    public async Task SearchPatients_ShouldReturnResults()
    {
        var patients = new List<Patient>
        {
            Patient.Create(TestTenantId, "MRN-001", "John", "Smith", DateTime.Today.AddYears(-30), BiologicalSex.Male),
            Patient.Create(TestTenantId, "MRN-002", "Jane", "Smith", DateTime.Today.AddYears(-25), BiologicalSex.Female),
        }.AsReadOnly();
        _repoMock.Setup(r => r.SearchAsync("Smith", 0, 20, default)).ReturnsAsync(patients);
        _repoMock.Setup(r => r.SearchAsync("Smith", 0, 10000, default)).ReturnsAsync(patients);

        var handler = new SearchPatientsHandler(_repoMock.Object);
        var (result, total) = await handler.Handle(new SearchPatientsQuery("Smith"), default);

        result.Should().HaveCount(2);
        total.Should().Be(2);
    }
}
