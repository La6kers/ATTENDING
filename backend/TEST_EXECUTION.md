# Test Execution Guide

This guide covers how to run the ATTENDING backend test suite locally.

---

## Prerequisites

- .NET 8 SDK
- Docker Desktop (only required for `[Category=Docker]` tests)
- No running SQL Server required for most tests (InMemory DB used)

---

## Test Categories

| Category | DB | Requires Docker | Run time |
|----------|----|-----------------|----------|
| Unit tests | None | No | Fast (~5s) |
| Handler integration | InMemory | No | Fast (~10s) |
| Controller integration | InMemory | No | Medium (~20s) |
| E2E clinical workflow | InMemory | No | Medium (~15s) |
| Security regression | InMemory | No | Fast (~10s) |
| Docker tests | Real SQL Server | **Yes** | Slow (~60s) |

---

## Quick Start (No Docker)

Run everything except Docker-dependent tests:

```bash
cd backend

dotnet test tests/ATTENDING.Integration.Tests \
  --filter "Category!=Docker" \
  --logger "console;verbosity=normal"
```

Run unit tests only:

```bash
dotnet test tests/ATTENDING.Domain.Tests \
  --logger "console;verbosity=normal"
```

---

## Full Suite (With Docker)

Requires Docker Desktop running. Testcontainers will pull `mcr.microsoft.com/mssql/server:2022-latest` automatically on first run.

```bash
cd backend

dotnet test \
  --logger "console;verbosity=normal" \
  --logger "trx;LogFileName=TestResults.trx"
```

---

## Individual Test Files

```bash
# Handler tests only
dotnet test tests/ATTENDING.Integration.Tests \
  --filter "FullyQualifiedName~HandlerTests" \
  --logger "console;verbosity=normal"

# Controller integration tests
dotnet test tests/ATTENDING.Integration.Tests \
  --filter "FullyQualifiedName~ControllerIntegrationTests" \
  --logger "console;verbosity=normal"

# E2E workflows
dotnet test tests/ATTENDING.Integration.Tests \
  --filter "FullyQualifiedName~E2EClinicalWorkflow" \
  --logger "console;verbosity=normal"

# Security regression
dotnet test tests/ATTENDING.Integration.Tests \
  --filter "FullyQualifiedName~SecurityRegression" \
  --logger "console;verbosity=normal"

# Multi-tenant isolation
dotnet test tests/ATTENDING.Integration.Tests \
  --filter "FullyQualifiedName~MultiTenantIsolation" \
  --logger "console;verbosity=normal"
```

---

## Code Coverage Report

Generate an HTML coverage report using `coverlet` and `reportgenerator`:

```bash
# Install report generator (once)
dotnet tool install -g dotnet-reportgenerator-globaltool

# Run tests with coverage
dotnet test \
  --filter "Category!=Docker" \
  --collect:"XPlat Code Coverage" \
  --results-directory ./TestResults

# Generate HTML report
reportgenerator \
  -reports:"./TestResults/**/coverage.cobertura.xml" \
  -targetdir:"./TestResults/CoverageReport" \
  -reporttypes:Html

# Open report
start TestResults/CoverageReport/index.html   # Windows
open TestResults/CoverageReport/index.html    # macOS
```

---

## Test Authentication

All integration/controller tests run with a synthetic provider identity injected by `AttendingWebApplicationFactory.TestAuthHandler`. No Azure AD B2C or real JWT tokens needed.

The test identity has these claims:

| Claim | Value |
|-------|-------|
| `sub` / `oid` | `00000000-0000-0000-0000-000000000001` |
| `email` | `test.provider@attending.test` |
| `name` | `Test Provider` |
| `role` | `Provider` |

---

## Environment Configuration

Tests use `appsettings.Testing.json` which:
- Sets `Authentication.DevBypass: false` (TestAuthHandler used instead)
- Uses empty connection strings (InMemory DB takes over)
- Disables health check external probes
- Sets minimum log level to `Warning` (reduces test noise)

---

## CI Integration

The GitHub Actions workflow at `.github/workflows/backend.yml` runs:

```yaml
- name: Test
  run: |
    dotnet test \
      --filter "Category!=Docker" \
      --logger "trx" \
      --collect:"XPlat Code Coverage"
```

Docker tests are skipped in CI by default. To enable them, add a `docker` service to the CI job and remove the filter.

---

## Troubleshooting

**Tests returning 401 Unauthorized**
- Confirm `AttendingWebApplicationFactory` is used (not `WebApplicationFactory<Program>` directly)
- Check that `UseEnvironment("Testing")` is set in the factory

**InMemory DB tests interfering with each other**
- Each factory instance creates a unique DB name (`AttendingApiTest_{Guid}`)
- If tests share a factory via `IClassFixture`, they share the DB — this is intentional for performance
- Use separate factory instances for isolation

**Docker tests timing out**
- Increase Testcontainers timeout in `SqlServerFixture.cs`
- Ensure Docker Desktop is running and has sufficient memory (4GB+)

**`dotnet test` not finding tests**
- Run `dotnet build` first to ensure all projects compile
- Check that test classes are `public` and test methods have `[Fact]` or `[Theory]`
