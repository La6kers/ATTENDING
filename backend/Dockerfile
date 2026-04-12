# =============================================================
# ATTENDING AI - Orders API Dockerfile
# Multi-stage build for minimal production image
# =============================================================

# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files and restore (layer caching)
COPY src/ATTENDING.Contracts/ATTENDING.Contracts.csproj src/ATTENDING.Contracts/
COPY src/ATTENDING.Domain/ATTENDING.Domain.csproj src/ATTENDING.Domain/
COPY src/ATTENDING.Application/ATTENDING.Application.csproj src/ATTENDING.Application/
COPY src/ATTENDING.Infrastructure/ATTENDING.Infrastructure.csproj src/ATTENDING.Infrastructure/
COPY src/ATTENDING.Orders.Api/ATTENDING.Orders.Api.csproj src/ATTENDING.Orders.Api/

RUN dotnet restore src/ATTENDING.Orders.Api/ATTENDING.Orders.Api.csproj

# Copy everything and build
COPY src/ src/
RUN dotnet publish src/ATTENDING.Orders.Api/ATTENDING.Orders.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Install wget for health checks (curl not available in aspnet image)
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*

# Security: run as non-root
RUN adduser --disabled-password --gecos '' appuser
USER appuser

COPY --from=build /app/publish .

# Health check (using wget — curl is not included in aspnet base image)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --spider -q http://localhost:8080/health/live || exit 1

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "ATTENDING.Orders.Api.dll"]
