# ATTENDING AI - Orders API
# Multi-stage build for optimized production image

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ["ATTENDING.Backend.sln", "./"]
COPY ["src/ATTENDING.Domain/ATTENDING.Domain.csproj", "src/ATTENDING.Domain/"]
COPY ["src/ATTENDING.Application/ATTENDING.Application.csproj", "src/ATTENDING.Application/"]
COPY ["src/ATTENDING.Infrastructure/ATTENDING.Infrastructure.csproj", "src/ATTENDING.Infrastructure/"]
COPY ["src/ATTENDING.Contracts/ATTENDING.Contracts.csproj", "src/ATTENDING.Contracts/"]
COPY ["src/ATTENDING.Orders.Api/ATTENDING.Orders.Api.csproj", "src/ATTENDING.Orders.Api/"]

# Restore dependencies
RUN dotnet restore "src/ATTENDING.Orders.Api/ATTENDING.Orders.Api.csproj"

# Copy everything else
COPY . .

# Build and publish
WORKDIR "/src/src/ATTENDING.Orders.Api"
RUN dotnet build "ATTENDING.Orders.Api.csproj" -c Release -o /app/build
RUN dotnet publish "ATTENDING.Orders.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser
USER appuser

# Copy published app
COPY --from=build /app/publish .

# Environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health/live || exit 1

# Entry point
ENTRYPOINT ["dotnet", "ATTENDING.Orders.Api.dll"]
