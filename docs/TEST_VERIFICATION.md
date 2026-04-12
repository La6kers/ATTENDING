# ATTENDING AI — Test Verification Guide

**Last Updated:** March 2026
**Purpose:** Step-by-step instructions for running the full test suite and achieving coverage targets.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| .NET SDK | 8.0.x | `winget install Microsoft.DotNet.SDK.8` |
| Node.js | 20.x | `winget install OpenJS.NodeJS.LTS` |
| Docker Desktop | Latest | Required for Testcontainers tests |
| SQL Server | 2022 | Via Docker or local install |
| Redis | 7.x | Via Docker or local install |

---

## Quick Start

### 1. Run All Tests (Excluding Docker)

```bash
cd backend
dotnet test --filter "Category!=Docker" --verbosity normal
```

Expected: 45+ test files pass, covering:
- Unit tests (Domain, Application layers)
- Integration tests (API controllers via WebApplicationFactory)
- Validation tests (FluentValidation pipelines)

### 2. Run Docker/Testcontainers Tests

```bash
# Ensure Docker Desktop is running
cd backend
dotnet test --filter "Category=Docker" --verbosity normal
```

### 3. Run Frontend Tests

```bash
npm run test:run -- --reporter=verbose
```

### 4. Run Full Coverage Report

```bash
# Backend coverage
cd backend
dotnet test --collect:"XPlat Code Coverage" --results-directory ./TestResults

# Generate HTML report (requires reportgenerator)
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator \
  -reports:"./TestResults/**/coverage.cobertura.xml" \
  -targetdir:"./TestResults/CoverageReport" \
  -reporttypes:"Html"

# Frontend coverage
npm run test:coverage
```

---

## Test Categories

| Category | Command | Description |
|----------|---------|-------------|
| All (no Docker) | `dotnet test --filter "Category!=Docker"` | Fast, no external deps |
| Docker only | `dotnet test --filter "Category=Docker"` | Testcontainers (SQL + Redis) |
| Specific file | `dotnet test --filter "FullyQualifiedName~ControllerIntegrationTests"` | Single test class |
| Frontend unit | `npm run test:run` | Vitest unit tests |
| Frontend coverage | `npm run test:coverage` | With Istanbul coverage |

---

## Test Infrastructure

### Backend Test Architecture

```
tests/
├── ATTENDING.Tests.Unit/           # Pure domain + application logic
│   ├── Domain/                     # Entity factory methods, value objects
│   ├── Application/                # Command/query handler tests
│   └── Validators/                 # FluentValidation rule tests
│
├── ATTENDING.Tests.Integration/    # API-level tests
│   ├── Controllers/                # WebApplicationFactory-based
│   ├── Fixtures/                   # TestAuthHandler, shared setup
│   └── Data/                       # Seed data helpers
│
└── ATTENDING.Tests.Docker/         # Real infrastructure tests
    ├── SqlServer/                  # Testcontainers SQL Server
    └── Redis/                      # Testcontainers Redis
```

### Key Test Helpers

- **TestAuthHandler**: Auto-authenticates as `test.provider@attending.test` with Provider role
- **AttendingWebApplicationFactory**: Creates isolated InMemory DB per test (`AttendingApiTest_{Guid}`)
- **WebApplicationFactory<Program>**: Full middleware pipeline for integration tests

### Authentication in Tests

| Environment | Handler | Identity |
|-------------|---------|----------|
| Production | Azure AD B2C | JWT bearer validation |
| Development | DevAuthHandler | Auto-auth when `DevBypass=true` |
| Testing | TestAuthHandler | Always authenticates as test provider |

Test identity:
```
sub/oid: 00000000-0000-0000-0000-000000000001
email:   test.provider@attending.test
name:    Test Provider
role:    Provider
```

---

## Coverage Targets

| Layer | Target | Critical Paths |
|-------|--------|----------------|
| Domain | 90%+ | Entity factories, red flag evaluator, drug interactions |
| Application | 85%+ | Command handlers, validators, event dispatchers |
| Infrastructure | 75%+ | Repository queries, caching, external service calls |
| API | 80%+ | Controller routing, middleware pipeline, auth |

### Clinical Safety Coverage (Must be 100%)

These paths must have complete test coverage:
- Red flag detection and evaluation
- Drug interaction checking (all severity levels)
- Critical lab result notifications
- Emergency access grant/revoke
- STAT/URGENT order priority handling

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `Connection refused (port 1433)` | Start SQL Server: `docker run -e 'ACCEPT_EULA=Y' -e 'MSSQL_SA_PASSWORD=YourPass123!' -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest` |
| `Connection refused (port 6379)` | Start Redis: `docker run -p 6379:6379 redis:7-alpine` |
| `TestAuthHandler not found` | Ensure test project references `ATTENDING.Tests.Integration` fixtures |
| Tests hang on startup | Check `appsettings.Testing.json` connection strings |
| Coverage report empty | Ensure `--collect:"XPlat Code Coverage"` flag is included |

### CI vs Local Differences

- CI uses `--filter "Category!=Docker"` to skip Testcontainers tests (no Docker-in-Docker)
- Local development can run all tests including Docker category
- InMemory database is used for integration tests (not SQL Server) for speed

---

## Running in CI

The GitHub Actions CI pipeline runs tests automatically:

```yaml
# Main CI (.github/workflows/ci.yml)
- Node.js tests: npm run test:run
- .NET tests: dotnet test --filter "Category!=Docker"

# Backend CI (.github/workflows/backend-ci.yml)  
- Triggers on backend/** changes
- Includes coverage collection
```

See `.github/workflows/ci.yml` for full pipeline configuration.
