using FluentAssertions;
using Microsoft.Extensions.Logging;
using ATTENDING.Application.Commands.Patients;
using ATTENDING.Application.Queries.Patients;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using Moq;
using Xunit;

namespace ATTENDING.Integration.Tests.Handlers;

public class PatientHandlerTests
{
    private readonly Mock<IPatientRepository> _repoMock = new();
    private readonly Mock<IUnitOfWork> _uowMock = new();
    private readonly Mock<ILogger<CreatePatientHandler>> _loggerMock = new();

    [Fact]
    public async Task CreatePatient_ValidInput_ShouldSucceed()
    {
        _repoMock.Setup(r => r.GetByMrnAsync(It.IsAny<string>(), default)).ReturnsAsync((Patient?)null);
        var handler = new CreatePatientHandler(_repoMock.Object, _uowMock.Object, _loggerMock.Object);

        var result = await handler.Handle(new CreatePatientCommand(
            "MRN-12345", "John", "Doe", new DateTime(1985, 3, 15), "Male",
            "555-1234", "john@test.com", null, null, null, null, "English"), default);

        result.Success.Should().BeTrue();
        result.PatientId.Should().NotBeEmpty();
        result.MRN.Should().Be("MRN-12345");
    }

    [Fact]
    public async Task CreatePatient_DuplicateMRN_ShouldFail()
    {
        var existing = Patient.Create("MRN-12345", "Jane", "Doe", new DateTime(1990, 1, 1), "Female");
        _repoMock.Setup(r => r.GetByMrnAsync("MRN-12345", default)).ReturnsAsync(existing);
        var handler = new CreatePatientHandler(_repoMock.Object, _uowMock.Object, _loggerMock.Object);

        var result = await handler.Handle(new CreatePatientCommand(
            "MRN-12345", "John", "Doe", new DateTime(1985, 3, 15), "Male",
            null, null, null, null, null, null, "English"), default);

        result.Success.Should().BeFalse();
        result.Error.Should().Contain("already exists");
    }

    [Fact]
    public async Task AddAllergy_ValidInput_ShouldSucceed()
    {
        var patient = Patient.Create("MRN-001", "Test", "Patient", DateTime.Today.AddYears(-30), "Male");
        _repoMock.Setup(r => r.GetWithAllergiesAsync(patient.Id, default)).ReturnsAsync(patient);

        var handler = new AddAllergyHandler(_repoMock.Object, _uowMock.Object);
        var result = await handler.Handle(new AddAllergyCommand(
            patient.Id, "Penicillin", AllergySeverity.Severe, "Anaphylaxis"), default);

        result.Success.Should().BeTrue();
        patient.Allergies.Should().HaveCount(1);
    }

    [Fact]
    public async Task AddAllergy_PatientNotFound_ShouldFail()
    {
        _repoMock.Setup(r => r.GetWithAllergiesAsync(It.IsAny<Guid>(), default)).ReturnsAsync((Patient?)null);
        var handler = new AddAllergyHandler(_repoMock.Object, _uowMock.Object);

        var result = await handler.Handle(new AddAllergyCommand(
            Guid.NewGuid(), "Penicillin", AllergySeverity.Mild, null), default);

        result.Success.Should().BeFalse();
    }

    [Fact]
    public async Task AddCondition_ValidInput_ShouldSucceed()
    {
        var patient = Patient.Create("MRN-002", "Test", "Patient", DateTime.Today.AddYears(-40), "Female");
        _repoMock.Setup(r => r.GetWithConditionsAsync(patient.Id, default)).ReturnsAsync(patient);

        var handler = new AddConditionHandler(_repoMock.Object, _uowMock.Object);
        var result = await handler.Handle(new AddConditionCommand(
            patient.Id, "E11.9", "Type 2 Diabetes", new DateTime(2020, 6, 1)), default);

        result.Success.Should().BeTrue();
        patient.Conditions.Should().HaveCount(1);
    }

    [Fact]
    public async Task SearchPatients_ShouldReturnResults()
    {
        var patients = new List<Patient>
        {
            Patient.Create("MRN-001", "John", "Smith", DateTime.Today.AddYears(-30), "Male"),
            Patient.Create("MRN-002", "Jane", "Smith", DateTime.Today.AddYears(-25), "Female"),
        }.AsReadOnly();
        _repoMock.Setup(r => r.SearchAsync("Smith", 0, 20, default)).ReturnsAsync(patients);
        _repoMock.Setup(r => r.SearchAsync("Smith", 0, 10000, default)).ReturnsAsync(patients);

        var handler = new SearchPatientsHandler(_repoMock.Object);
        var (result, total) = await handler.Handle(new SearchPatientsQuery("Smith"), default);

        result.Should().HaveCount(2);
        total.Should().Be(2);
    }
}
