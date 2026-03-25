# ATTENDING AI — Deployment Guide

**Last Updated:** February 21, 2026

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (for SQL Server)
- .NET 8 SDK (for backend)
- Git

### 1. Clone and Install

```bash
git clone https://github.com/La6kers/ATTENDING.git
cd ATTENDING
npm install
```

### 2. Start Database

```bash
docker-compose up -d
```

This starts Microsoft SQL Server on localhost:1433.

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your local settings:

```env
# Database (SQL Server via Docker)
DATABASE_URL="sqlserver://localhost:1433;database=attending_dev;user=sa;password=YourStrong!Password;trustServerCertificate=true"

# Auth (NextAuth)
NEXTAUTH_SECRET="generate-a-random-32-char-string-here"
NEXTAUTH_URL="http://localhost:3000"

# Feature flags
NEXT_PUBLIC_USE_MOCK_DATA=true
```

**NEVER commit .env to git.** It is in .gitignore.

### 4. Run Database Migrations

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

### 5. Start Development Servers

```bash
# Both portals (via Turborepo)
npm run dev

# Or individually:
npm run dev:provider    # http://localhost:3000
npm run dev:patient     # http://localhost:3001
```

### 6. Start .NET Backend (when ready)

```bash
cd backend
dotnet restore
dotnet run --project src/ATTENDING.Orders.Api/
# Swagger UI: http://localhost:5000/swagger
# Health check: http://localhost:5000/health
```

---

## Environment Strategy

| Environment | URL | Database | Deploys On |
|-------------|-----|----------|-----------|
| Dev | localhost:3000 / :5000 | Local SQL Server (Docker) | Manual |
| Staging | staging.attendingai.health | Azure SQL (staging) | Push to main |
| Production | app.attendingai.health | Azure SQL (production) | Manual with confirmation |

### Environment-Specific Secrets

Each GitHub Environment contains:
- `DATABASE_URL` — Connection string for that environment's database
- `AZURE_WEBAPP_PUBLISH_PROFILE` — Azure App Service publish profile
- `NEXTAUTH_SECRET` — Unique per environment, from Azure Key Vault
- `APPLICATION_INSIGHTS_KEY` — Monitoring instrumentation key

### Runtime Configuration

Client-side config is NOT bundled (per Peter's guidance on React bundling). Instead:

- **Server-side:** Next.js `getServerSideProps` injects runtime values from environment variables
- **Client-side:** `/api/config` endpoint returns non-sensitive runtime config
- **.NET:** `appsettings.{Environment}.json` + Azure App Configuration

---

## CI/CD Pipeline

### On Every Pull Request (ci.yml)

1. Lint + typecheck
2. Unit + integration tests (with SQL Server + Redis service containers)
3. Build verification (both portals)
4. Security audit (npm audit + secret scanning)
5. Docker build test

**Merge is blocked if any step fails.**

### On Push to Main (deploy-staging)

1. Build Docker images
2. Push to Azure Container Registry
3. Deploy to staging Azure App Service
4. Run smoke tests against staging URL

### Production Deploy (manual trigger)

1. Requires typed confirmation ("deploy")
2. Pulls staging-verified images
3. Deploys to production Azure App Service
4. Runs smoke tests
5. Notifies team via Slack

### Backend Pipeline (backend.yml)

Triggered only by changes in `backend/` directory:
1. dotnet build + test
2. Trivy security scan
3. CodeQL analysis
4. Docker image build + push
5. Deploy to staging/production

---

## Azure Resources (To Be Provisioned)

| Resource | SKU / Tier | Purpose |
|----------|-----------|---------|
| Azure SQL Database | Standard S2 | Production database |
| Azure App Service (Provider) | B2 | Provider portal hosting |
| Azure App Service (Patient) | B1 | Patient portal hosting |
| Azure App Service (API) | B2 | .NET backend hosting |
| Azure AD B2C | Free tier | Authentication |
| Azure Key Vault | Standard | Secrets management |
| Application Insights | Pay-as-you-go | Logging + monitoring |
| Azure Container Registry | Basic | Docker image storage |
| Azure App Configuration | Free tier | Feature flags + runtime config |
| Redis Cache | Basic C0 | Rate limiting + sessions |

---

## Health Checks

| Endpoint | Expected | Purpose |
|----------|----------|---------|
| GET /health | 200 OK | Basic liveness |
| GET /health/ready | 200 OK | Readiness (DB connected) |
| GET /health/live | 200 OK | Liveness (process running) |
| GET /api/v1/system/ping | 200 "pong" | API reachability |

---

## Troubleshooting

**Database won't connect:** Verify Docker is running (`docker ps`). Check DATABASE_URL in .env matches docker-compose.yml credentials.

**Prisma migration fails:** Run `npx prisma migrate status` to see pending migrations. If corrupt, reset with `npx prisma migrate reset` (destroys data).

**Build fails with type errors:** Run `npx prisma generate` first — Prisma client types must be generated before TypeScript can compile.

**.NET backend won't start:** Check that the SQL Server connection string in `appsettings.Development.json` matches your local Docker instance.
