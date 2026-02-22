# ============================================================
# ATTENDING AI - Azure Infrastructure (Terraform)
# infrastructure/terraform/main.tf
#
# Phase 4: Updated for Azure SQL (was PostgreSQL), added .NET API.
# HIPAA-compliant infrastructure with reserved instance savings.
# ============================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.90"
    }
  }

  backend "azurerm" {
    resource_group_name  = "attending-terraform-state"
    storage_account_name = "attendingtfstate"
    container_name       = "tfstate"
    key                  = "production.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}

# ============================================================
# Variables
# ============================================================

variable "environment" {
  description = "Environment (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "westus2"
}

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
  default     = "attending"
}

variable "sql_admin_login" {
  description = "Azure SQL admin login"
  type        = string
  default     = "attendingadmin"
}

variable "sql_admin_password" {
  description = "Azure SQL admin password"
  type        = string
  sensitive   = true
}

locals {
  resource_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = "ATTENDING AI"
    Environment = var.environment
    ManagedBy   = "Terraform"
    CostCenter  = "Engineering"
    HIPAA       = "true"
  }
}

# ============================================================
# Resource Group
# ============================================================

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.resource_prefix}"
  location = var.location
  tags     = local.common_tags
}

# ============================================================
# Azure SQL Server + Database
# Replaces PostgreSQL — aligned with Prisma sqlserver provider
# and docker-compose SQL Server 2022 dev environment.
#
# TDE (Transparent Data Encryption) enabled by default on Azure SQL.
# HIPAA 164.312(a)(2)(iv) — Encryption at rest.
# ============================================================

resource "azurerm_mssql_server" "main" {
  name                         = "sql-${local.resource_prefix}"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_login
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"

  azuread_administrator {
    login_username = "attending-sql-admins"
    object_id      = var.azure_ad_admin_group_id
  }

  tags = local.common_tags
}

variable "azure_ad_admin_group_id" {
  description = "Azure AD group object ID for SQL admin access"
  type        = string
  default     = ""
}

resource "azurerm_mssql_database" "main" {
  name      = "attending_db"
  server_id = azurerm_mssql_server.main.id
  sku_name  = var.environment == "production" ? "S3" : "S1"

  max_size_gb                 = var.environment == "production" ? 250 : 50
  zone_redundant              = var.environment == "production"
  geo_backup_enabled          = true # HIPAA DR compliance
  read_scale                  = var.environment == "production"

  short_term_retention_policy {
    retention_days           = 35 # HIPAA: retain backups
    backup_interval_in_hours = 12
  }

  long_term_retention_policy {
    weekly_retention  = "P4W"
    monthly_retention = "P12M"
    yearly_retention  = "P6Y" # HIPAA 6-year minimum
    week_of_year      = 1
  }

  tags = local.common_tags
}

# Firewall: allow Azure services
resource "azurerm_mssql_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# ============================================================
# App Service Plan (Linux) — Shared by Next.js portals
# ============================================================

resource "azurerm_service_plan" "frontend" {
  name                = "asp-${local.resource_prefix}-frontend"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = var.environment == "production" ? "P2v3" : "B2"

  tags = local.common_tags
}

# ============================================================
# App Service Plan (Linux) — .NET Backend API
# ============================================================

resource "azurerm_service_plan" "backend" {
  name                = "asp-${local.resource_prefix}-backend"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = var.environment == "production" ? "P1v3" : "B1"

  tags = local.common_tags
}

# ============================================================
# App Service - Provider Portal (Next.js)
# ============================================================

resource "azurerm_linux_web_app" "provider_portal" {
  name                = "app-${local.resource_prefix}-provider"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.frontend.id

  site_config {
    always_on            = var.environment == "production"
    http2_enabled        = true
    minimum_tls_version  = "1.2"
    health_check_path    = "/api/health"

    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = {
    "WEBSITE_NODE_DEFAULT_VERSION" = "~20"
    "NODE_ENV"                     = "production"
    "NEXT_TELEMETRY_DISABLED"      = "1"
    "DATABASE_URL"                 = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.db_connection_string.id})"
    "NEXTAUTH_SECRET"              = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.nextauth_secret.id})"
    "NEXTAUTH_URL"                 = "https://app-${local.resource_prefix}-provider.azurewebsites.net"
    "REDIS_URL"                    = "rediss://:${azurerm_redis_cache.main.primary_access_key}@${azurerm_redis_cache.main.hostname}:${azurerm_redis_cache.main.ssl_port}"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = local.common_tags
}

# ============================================================
# App Service - Patient Portal (COMPASS)
# ============================================================

resource "azurerm_linux_web_app" "patient_portal" {
  name                = "app-${local.resource_prefix}-patient"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.frontend.id

  site_config {
    always_on            = var.environment == "production"
    http2_enabled        = true
    minimum_tls_version  = "1.2"
    health_check_path    = "/api/health"

    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = {
    "WEBSITE_NODE_DEFAULT_VERSION" = "~20"
    "NODE_ENV"                     = "production"
    "NEXT_TELEMETRY_DISABLED"      = "1"
    "DATABASE_URL"                 = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.db_connection_string.id})"
    "NEXTAUTH_SECRET"              = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.nextauth_secret.id})"
    "NEXTAUTH_URL"                 = "https://app-${local.resource_prefix}-patient.azurewebsites.net"
    "REDIS_URL"                    = "rediss://:${azurerm_redis_cache.main.primary_access_key}@${azurerm_redis_cache.main.hostname}:${azurerm_redis_cache.main.ssl_port}"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = local.common_tags
}

# ============================================================
# App Service - .NET Orders API
# ============================================================

resource "azurerm_linux_web_app" "orders_api" {
  name                = "app-${local.resource_prefix}-api"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.backend.id

  site_config {
    always_on            = var.environment == "production"
    http2_enabled        = true
    minimum_tls_version  = "1.2"
    health_check_path    = "/health/live"
    websocket_enabled    = true # SignalR

    application_stack {
      dotnet_version = "8.0"
    }
  }

  app_settings = {
    "ASPNETCORE_ENVIRONMENT"     = var.environment == "production" ? "Production" : "Staging"
    "ConnectionStrings__Default" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.db_connection_string_dotnet.id})"
    "Redis__ConnectionString"    = "${azurerm_redis_cache.main.hostname}:${azurerm_redis_cache.main.ssl_port},password=${azurerm_redis_cache.main.primary_access_key},ssl=True,abortConnect=False"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = local.common_tags
}

# ============================================================
# Redis Cache - Sessions, Rate Limiting, AI Response Cache
# ============================================================

resource "azurerm_redis_cache" "main" {
  name                = "redis-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = var.environment == "production" ? 1 : 0
  family              = "C"
  sku_name            = var.environment == "production" ? "Standard" : "Basic"
  minimum_tls_version = "1.2"
  non_ssl_port_enabled = false

  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }

  tags = local.common_tags
}

# ============================================================
# Key Vault — Secrets management
# HIPAA 164.312(a)(2)(iv) — Encryption key management
# ============================================================

resource "azurerm_key_vault" "main" {
  name                       = "kv-${local.resource_prefix}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  purge_protection_enabled   = true
  soft_delete_retention_days = 90

  tags = local.common_tags
}

data "azurerm_client_config" "current" {}

# Grant App Services access to Key Vault
resource "azurerm_key_vault_access_policy" "provider_portal" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app.provider_portal.identity[0].principal_id

  secret_permissions = ["Get", "List"]
}

resource "azurerm_key_vault_access_policy" "patient_portal" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app.patient_portal.identity[0].principal_id

  secret_permissions = ["Get", "List"]
}

resource "azurerm_key_vault_access_policy" "orders_api" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app.orders_api.identity[0].principal_id

  secret_permissions = ["Get", "List"]
}

resource "azurerm_key_vault_access_policy" "deployer" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = ["Get", "List", "Set", "Delete", "Purge", "Recover"]
}

# Secrets
resource "azurerm_key_vault_secret" "db_connection_string" {
  name         = "database-url"
  value        = "sqlserver://${azurerm_mssql_server.main.fully_qualified_domain_name}:1433;database=attending_db;user=${var.sql_admin_login};password=${var.sql_admin_password};encrypt=true;trustServerCertificate=false"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "db_connection_string_dotnet" {
  name         = "database-url-dotnet"
  value        = "Server=tcp:${azurerm_mssql_server.main.fully_qualified_domain_name},1433;Initial Catalog=attending_db;User ID=${var.sql_admin_login};Password=${var.sql_admin_password};Encrypt=True;TrustServerCertificate=False;"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "nextauth_secret" {
  name         = "nextauth-secret"
  value        = "CHANGE-ME-generate-with-openssl-rand-base64-32"
  key_vault_id = azurerm_key_vault.main.id

  lifecycle {
    ignore_changes = [value] # Don't overwrite after initial set
  }
}

# ============================================================
# Storage Account - PHI Audit Log Archival
# HIPAA 164.530(j) — 6-year minimum retention
# ============================================================

resource "azurerm_storage_account" "audit_logs" {
  name                     = "st${var.project_name}audit${var.environment}"
  location                 = azurerm_resource_group.main.location
  resource_group_name      = azurerm_resource_group.main.name
  account_tier             = "Standard"
  account_replication_type = "GRS"
  min_tls_version          = "TLS1_2"

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 365
    }

    container_delete_retention_policy {
      days = 90
    }
  }

  tags = merge(local.common_tags, {
    DataClassification = "PHI"
    RetentionPolicy    = "6-years"
  })
}

resource "azurerm_storage_container" "audit_logs" {
  name                  = "phi-audit-logs"
  storage_account_name  = azurerm_storage_account.audit_logs.name
  container_access_type = "private"
}

resource "azurerm_storage_management_policy" "audit_archival" {
  storage_account_id = azurerm_storage_account.audit_logs.id

  rule {
    name    = "audit-log-lifecycle"
    enabled = true

    filters {
      prefix_match = ["phi-audit-logs/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 90
        tier_to_archive_after_days_since_modification_greater_than = 365
        delete_after_days_since_modification_greater_than          = 2190 # 6 years
      }

      snapshot {
        delete_after_days_since_creation_greater_than = 365
      }
    }
  }
}

# ============================================================
# Outputs
# ============================================================

output "provider_portal_url" {
  value = "https://${azurerm_linux_web_app.provider_portal.default_hostname}"
}

output "patient_portal_url" {
  value = "https://${azurerm_linux_web_app.patient_portal.default_hostname}"
}

output "orders_api_url" {
  value = "https://${azurerm_linux_web_app.orders_api.default_hostname}"
}

output "sql_server_fqdn" {
  value     = azurerm_mssql_server.main.fully_qualified_domain_name
  sensitive = true
}

output "redis_hostname" {
  value     = azurerm_redis_cache.main.hostname
  sensitive = true
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}

output "audit_storage_account" {
  value = azurerm_storage_account.audit_logs.name
}
