using ATTENDING.Application.Interfaces;
using ATTENDING.Domain.Common;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;
using ATTENDING.Domain.Interfaces;
using MediatR;

namespace ATTENDING.Application.Commands.Organizations;

// ── Commands ─────────────────────────────────────────────────────────────

public record ProvisionOrganizationCommand(
    string Name, string PrimaryContactName, string PrimaryContactEmail,
    string? NPI = null, int MaxProviderSeats = 10,
    string? Address = null, string? City = null, string? State = null,
    string? ZipCode = null, string? TimeZone = null
) : IRequest<Result<OrganizationProvisionedDto>>;

public record ConfigureEhrConnectorCommand(
    Guid OrganizationId, EhrVendor Vendor, string ClientId,
    string? ClientSecret = null, string? FhirBaseUrl = null,
    string? EhrTenantId = null, string Label = "Primary EHR"
) : IRequest<Result<EhrConnectorConfiguredDto>>;

public record TestEhrConnectionCommand(Guid OrganizationId, Guid ConnectorId)
    : IRequest<Result<EhrConnectionTestResultDto>>;

public record SeedOrganizationDataCommand(
    Guid OrganizationId, bool IncludeDemoPatients = true, bool IncludeReferenceData = true
) : IRequest<Result<DataSeedResultDto>>;

public record ActivateOrganizationCommand(Guid OrganizationId)
    : IRequest<Result<OrganizationActivatedDto>>;

public record SetDataModeCommand(Guid OrganizationId, DataMode Mode)
    : IRequest<Result<DataModeSetDto>>;

// ── DTOs ─────────────────────────────────────────────────────────────────

public record OrganizationProvisionedDto(Guid OrganizationId, string Name, string Slug,
    OnboardingStatus Status, DataMode DataMode);
public record EhrConnectorConfiguredDto(Guid ConnectorId, Guid OrganizationId,
    EhrVendor Vendor, string Label, OnboardingStatus OrganizationStatus);
public record EhrConnectionTestResultDto(bool Success, string? ServerVersion,
    string[] SupportedResources, string? ErrorMessage, OnboardingStatus OrganizationStatus);
public record DataSeedResultDto(int PatientsSeeded, int EncountersSeeded,
    int LabOrdersSeeded, OnboardingStatus OrganizationStatus);
public record OrganizationActivatedDto(Guid OrganizationId, string Name,
    OnboardingStatus Status, DataMode DataMode);
public record DataModeSetDto(Guid OrganizationId, DataMode Mode);

// ── Handlers ─────────────────────────────────────────────────────────────

public class ProvisionOrganizationHandler
    : IRequestHandler<ProvisionOrganizationCommand, Result<OrganizationProvisionedDto>>
{
    private readonly IOrganizationRepository _repository;
    private readonly IUnitOfWork _unitOfWork;

    public ProvisionOrganizationHandler(IOrganizationRepository repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<OrganizationProvisionedDto>> Handle(
        ProvisionOrganizationCommand cmd, CancellationToken ct)
    {
        var slug = GenerateSlug(cmd.Name);
        var suffix = 0;
        var candidateSlug = slug;
        while (await _repository.SlugExistsAsync(candidateSlug, ct))
        {
            suffix++;
            candidateSlug = $"{slug}-{suffix}";
        }

        var org = Organization.Create(cmd.Name, candidateSlug,
            cmd.PrimaryContactName, cmd.PrimaryContactEmail,
            cmd.NPI, cmd.MaxProviderSeats);

        if (cmd.Address != null || cmd.City != null || cmd.State != null)
            org.UpdateProfile(address: cmd.Address, city: cmd.City,
                state: cmd.State, zipCode: cmd.ZipCode, timeZone: cmd.TimeZone);

        await _repository.AddAsync(org, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success(new OrganizationProvisionedDto(
            org.Id, org.Name, org.Slug, org.OnboardingStatus, org.DataMode));
    }

    private static string GenerateSlug(string name) =>
        new string(name.ToLowerInvariant().Replace(' ', '-')
            .Where(c => char.IsLetterOrDigit(c) || c == '-').ToArray()).Trim('-');
}

public class ConfigureEhrConnectorHandler
    : IRequestHandler<ConfigureEhrConnectorCommand, Result<EhrConnectorConfiguredDto>>
{
    private readonly IOrganizationRepository _repository;
    private readonly IUnitOfWork _unitOfWork;

    public ConfigureEhrConnectorHandler(IOrganizationRepository repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<EhrConnectorConfiguredDto>> Handle(
        ConfigureEhrConnectorCommand cmd, CancellationToken ct)
    {
        var org = await _repository.GetByIdAsync(cmd.OrganizationId, ct);
        if (org is null)
            return Result<EhrConnectorConfiguredDto>.Failure("Organization not found.");

        var connector = org.AddEhrConnector(cmd.Vendor, cmd.ClientId,
            cmd.ClientSecret, cmd.FhirBaseUrl, cmd.EhrTenantId, cmd.Label);

        _repository.Update(org);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success(new EhrConnectorConfiguredDto(
            connector.Id, org.Id, cmd.Vendor, cmd.Label, org.OnboardingStatus));
    }
}

public class TestEhrConnectionHandler
    : IRequestHandler<TestEhrConnectionCommand, Result<EhrConnectionTestResultDto>>
{
    private readonly IOrganizationRepository _repository;
    private readonly IEhrConnectorRepository _connectorRepo;
    private readonly IFhirConnectionTester _tester;
    private readonly IUnitOfWork _unitOfWork;

    public TestEhrConnectionHandler(IOrganizationRepository repository,
        IEhrConnectorRepository connectorRepo, IFhirConnectionTester tester, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _connectorRepo = connectorRepo;
        _tester = tester;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<EhrConnectionTestResultDto>> Handle(
        TestEhrConnectionCommand cmd, CancellationToken ct)
    {
        var org = await _repository.GetByIdAsync(cmd.OrganizationId, ct);
        if (org is null)
            return Result<EhrConnectionTestResultDto>.Failure("Organization not found.");

        var connector = await _connectorRepo.GetByIdAsync(cmd.ConnectorId, ct);
        if (connector is null || connector.OrganizationId != cmd.OrganizationId)
            return Result<EhrConnectionTestResultDto>.Failure("Connector not found.");

        try
        {
            var result = await _tester.TestConnectionAsync(connector, ct);

            if (result.Success)
            {
                var details = $"Connected to {connector.Vendor} FHIR R4. " +
                    $"Server: {result.ServerVersion}. Resources: {string.Join(", ", result.SupportedResources)}.";
                org.MarkConnectionVerified(connector.Id, details);
            }
            else
            {
                connector.MarkFailed(result.ErrorMessage ?? "Unknown error");
            }

            _repository.Update(org);
            await _unitOfWork.SaveChangesAsync(ct);

            return Result.Success(new EhrConnectionTestResultDto(
                result.Success, result.ServerVersion, result.SupportedResources,
                result.ErrorMessage, org.OnboardingStatus));
        }
        catch (Exception ex)
        {
            connector.MarkFailed(ex.Message);
            _repository.Update(org);
            await _unitOfWork.SaveChangesAsync(ct);

            return Result.Success(new EhrConnectionTestResultDto(
                false, null, Array.Empty<string>(), ex.Message, org.OnboardingStatus));
        }
    }
}

public class SeedOrganizationDataHandler
    : IRequestHandler<SeedOrganizationDataCommand, Result<DataSeedResultDto>>
{
    private readonly IOrganizationRepository _repository;
    private readonly ISyntheticDataSeeder _seeder;
    private readonly IUnitOfWork _unitOfWork;

    public SeedOrganizationDataHandler(IOrganizationRepository repository,
        ISyntheticDataSeeder seeder, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _seeder = seeder;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<DataSeedResultDto>> Handle(
        SeedOrganizationDataCommand cmd, CancellationToken ct)
    {
        var org = await _repository.GetByIdAsync(cmd.OrganizationId, ct);
        if (org is null)
            return Result<DataSeedResultDto>.Failure("Organization not found.");

        var result = await _seeder.SeedAsync(
            org.Id, cmd.IncludeDemoPatients, cmd.IncludeReferenceData, ct);

        org.MarkDataSeeded();
        _repository.Update(org);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success(new DataSeedResultDto(
            result.PatientCount, result.EncounterCount,
            result.LabOrderCount, org.OnboardingStatus));
    }
}

public class ActivateOrganizationHandler
    : IRequestHandler<ActivateOrganizationCommand, Result<OrganizationActivatedDto>>
{
    private readonly IOrganizationRepository _repository;
    private readonly IUnitOfWork _unitOfWork;

    public ActivateOrganizationHandler(IOrganizationRepository repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<OrganizationActivatedDto>> Handle(
        ActivateOrganizationCommand cmd, CancellationToken ct)
    {
        var org = await _repository.GetByIdAsync(cmd.OrganizationId, ct);
        if (org is null)
            return Result<OrganizationActivatedDto>.Failure("Organization not found.");

        org.Activate();
        _repository.Update(org);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success(new OrganizationActivatedDto(
            org.Id, org.Name, org.OnboardingStatus, org.DataMode));
    }
}

public class SetDataModeHandler
    : IRequestHandler<SetDataModeCommand, Result<DataModeSetDto>>
{
    private readonly IOrganizationRepository _repository;
    private readonly IUnitOfWork _unitOfWork;

    public SetDataModeHandler(IOrganizationRepository repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<DataModeSetDto>> Handle(SetDataModeCommand cmd, CancellationToken ct)
    {
        var org = await _repository.GetByIdAsync(cmd.OrganizationId, ct);
        if (org is null)
            return Result<DataModeSetDto>.Failure("Organization not found.");

        org.SetDataMode(cmd.Mode);
        _repository.Update(org);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success(new DataModeSetDto(org.Id, cmd.Mode));
    }
}
