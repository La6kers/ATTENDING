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

variable "nextauth_secret" {
  description = "NextAuth.js session signing secret (generate with: openssl rand -base64 32). Must be set for production."
  type        = string
  sensitive   = true
  default     = ""
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

variable "sql_app_login" {
  description = "Application-level SQL user login (falls back to admin if empty)"
  type        = string
  default     = ""
}

variable "sql_app_password" {
  description = "Application-level SQL user password (falls back to admin if empty)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "alert_email" {
  description = "Email address for critical alerts"
  type        = string
  default     = "ops@attendingai.com"
}

locals {
  resource_prefix = "${var.project_name}-${var.environment}"
  sql_app_login    = var.sql_app_login != "" ? var.sql_app_login : var.sql_admin_login
  sql_app_password = var.sql_app_password != "" ? var.sql_app_password : var.sql_admin_password
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

  dynamic "azuread_administrator" {
    for_each = var.azure_ad_admin_group_id != "" ? [1] : []
    content {
      login_username = "attending-sql-admins"
      object_id      = var.azure_ad_admin_group_id
    }
  }

  public_network_access_enabled = false

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

# Firewall rule for Azure services removed — the SQL server uses
# public_network_access_enabled = false with private endpoints,
# making this 0.0.0.0/0.0.0.0 rule redundant and overly permissive.

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
  https_only          = true

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
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = azurerm_application_insights.main.connection_string
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
  https_only          = true

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
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = azurerm_application_insights.main.connection_string
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
  https_only          = true

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
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = azurerm_application_insights.main.connection_string
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
  family              = var.environment == "production" ? "P" : "C"
  sku_name            = var.environment == "production" ? "Premium" : "Basic"
  minimum_tls_version = "1.2"
  non_ssl_port_enabled = false
  public_network_access_enabled = false

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

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
    virtual_network_rules {
      subnet_id = azurerm_subnet.frontend.id
    }
    virtual_network_rules {
      subnet_id = azurerm_subnet.backend.id
    }
  }

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
# TODO: Provision a dedicated application SQL user with minimal permissions
# (db_datareader, db_datawriter) instead of reusing the admin account.
resource "azurerm_key_vault_secret" "db_connection_string" {
  name         = "database-url"
  value        = "sqlserver://${azurerm_mssql_server.main.fully_qualified_domain_name}:1433;database=attending_db;user=${local.sql_app_login};password=${local.sql_app_password};encrypt=true;trustServerCertificate=false"
  key_vault_id = azurerm_key_vault.main.id
}

# TODO: Provision a dedicated application SQL user with minimal permissions
# (db_datareader, db_datawriter) instead of reusing the admin account.
resource "azurerm_key_vault_secret" "db_connection_string_dotnet" {
  name         = "database-url-dotnet"
  value        = "Server=tcp:${azurerm_mssql_server.main.fully_qualified_domain_name},1433;Initial Catalog=attending_db;User ID=${local.sql_app_login};Password=${local.sql_app_password};Encrypt=True;TrustServerCertificate=False;"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "nextauth_secret" {
  name         = "nextauth-secret"
  value        = var.nextauth_secret != "" ? var.nextauth_secret : "CHANGE-ME-generate-with-openssl-rand-base64-32"
  key_vault_id = azurerm_key_vault.main.id

  lifecycle {
    ignore_changes = [value]
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
  account_replication_type     = "GRS"
  min_tls_version              = "TLS1_2"
  enable_https_traffic_only    = true

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 365
    }

    container_delete_retention_policy {
      days = 90
    }
  }

  network_rules {
    default_action             = "Deny"
    virtual_network_subnet_ids = [azurerm_subnet.data.id]
    bypass                     = ["AzureServices", "Logging"]
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
  # Immutability policy managed separately — see azurerm_storage_container_immutability_policy.audit_logs
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
# Storage Container Immutability — HIPAA 6-year retention
# ============================================================

resource "azurerm_storage_container_immutability_policy" "audit_logs" {
  storage_container_resource_manager_id = azurerm_storage_container.audit_logs.resource_manager_id
  immutability_period_in_days           = 2190 # 6 years HIPAA retention
}

# ============================================================
# Log Analytics Workspace + Application Insights (OpenTelemetry)
# ============================================================

resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 365

  tags = local.common_tags
}

resource "azurerm_application_insights" "main" {
  name                = "appi-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"

  tags = local.common_tags
}

# ============================================================
# Diagnostic Settings — SQL Server and Key Vault Audit Logging
# HIPAA 164.312(b) — Audit controls
# ============================================================

resource "azurerm_monitor_diagnostic_setting" "sql_server" {
  name                       = "diag-sql-${local.resource_prefix}"
  target_resource_id         = "${azurerm_mssql_server.main.id}/databases/master"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "SQLSecurityAuditEvents"
  }
}

resource "azurerm_monitor_diagnostic_setting" "key_vault" {
  name                       = "diag-kv-${local.resource_prefix}"
  target_resource_id         = azurerm_key_vault.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AuditEvent"
  }
}

# ============================================================
# Diagnostic Settings — App Service Logging
# HIPAA 164.312(b) — Audit controls
# ============================================================

resource "azurerm_monitor_diagnostic_setting" "provider_portal" {
  name                       = "diag-provider-${local.resource_prefix}"
  target_resource_id         = azurerm_linux_web_app.provider_portal.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AppServiceHTTPLogs"
  }

  enabled_log {
    category = "AppServiceConsoleLogs"
  }
}

resource "azurerm_monitor_diagnostic_setting" "patient_portal" {
  name                       = "diag-patient-${local.resource_prefix}"
  target_resource_id         = azurerm_linux_web_app.patient_portal.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AppServiceHTTPLogs"
  }

  enabled_log {
    category = "AppServiceConsoleLogs"
  }
}

resource "azurerm_monitor_diagnostic_setting" "orders_api" {
  name                       = "diag-orders-${local.resource_prefix}"
  target_resource_id         = azurerm_linux_web_app.orders_api.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AppServiceHTTPLogs"
  }

  enabled_log {
    category = "AppServiceConsoleLogs"
  }
}

# ============================================================
# Virtual Network + Subnets — Network Isolation
# ============================================================

resource "azurerm_virtual_network" "main" {
  name                = "vnet-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.0.0.0/16"]

  tags = local.common_tags
}

resource "azurerm_subnet" "frontend" {
  name                 = "snet-frontend"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]

  delegation {
    name = "webapp-delegation"

    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet" "backend" {
  name                 = "snet-backend"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]

  delegation {
    name = "webapp-delegation"

    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet" "data" {
  name                              = "snet-data"
  resource_group_name               = azurerm_resource_group.main.name
  virtual_network_name              = azurerm_virtual_network.main.name
  address_prefixes                  = ["10.0.3.0/24"]
  private_endpoint_network_policies = "Enabled"
}

resource "azurerm_subnet" "frontdoor" {
  name                 = "snet-frontdoor"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.4.0/24"]
}

# ============================================================
# Network Security Groups — Subnet-level traffic filtering
# ============================================================

# --- Frontend NSG ---

resource "azurerm_network_security_group" "frontend" {
  name                = "nsg-frontend-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowHTTPSInbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowOutboundToBackend"
    priority                   = 100
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "8080"
    source_address_prefix      = "*"
    destination_address_prefix = "10.0.2.0/24"
  }

  tags = local.common_tags
}

resource "azurerm_subnet_network_security_group_association" "frontend" {
  subnet_id                 = azurerm_subnet.frontend.id
  network_security_group_id = azurerm_network_security_group.frontend.id
}

# --- Backend NSG ---

resource "azurerm_network_security_group" "backend" {
  name                = "nsg-backend-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowInboundFromFrontend"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "8080"
    source_address_prefix      = "10.0.1.0/24"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowOutboundToDataSQL"
    priority                   = 100
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "1433"
    source_address_prefix      = "*"
    destination_address_prefix = "10.0.3.0/24"
  }

  security_rule {
    name                       = "AllowOutboundToDataRedis"
    priority                   = 110
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "6380"
    source_address_prefix      = "*"
    destination_address_prefix = "10.0.3.0/24"
  }

  tags = local.common_tags
}

resource "azurerm_subnet_network_security_group_association" "backend" {
  subnet_id                 = azurerm_subnet.backend.id
  network_security_group_id = azurerm_network_security_group.backend.id
}

# --- Data NSG ---

resource "azurerm_network_security_group" "data" {
  name                = "nsg-data-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowInboundSQL"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "1433"
    source_address_prefix      = "10.0.2.0/24"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowInboundRedis"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "6380"
    source_address_prefix      = "10.0.2.0/24"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = local.common_tags
}

resource "azurerm_subnet_network_security_group_association" "data" {
  subnet_id                 = azurerm_subnet.data.id
  network_security_group_id = azurerm_network_security_group.data.id
}

# ============================================================
# VNet Integration — App Services
# ============================================================

resource "azurerm_app_service_virtual_network_swift_connection" "provider_portal" {
  app_service_id = azurerm_linux_web_app.provider_portal.id
  subnet_id      = azurerm_subnet.frontend.id
}

resource "azurerm_app_service_virtual_network_swift_connection" "patient_portal" {
  app_service_id = azurerm_linux_web_app.patient_portal.id
  subnet_id      = azurerm_subnet.frontend.id
}

resource "azurerm_app_service_virtual_network_swift_connection" "orders_api" {
  app_service_id = azurerm_linux_web_app.orders_api.id
  subnet_id      = azurerm_subnet.backend.id
}

# ============================================================
# Private Endpoints — SQL Server + Redis
# HIPAA 164.312(e)(1) — Transmission security via private network
# ============================================================

resource "azurerm_private_endpoint" "sql" {
  name                = "pe-sql-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.data.id

  private_service_connection {
    name                           = "psc-sql-${local.resource_prefix}"
    private_connection_resource_id = azurerm_mssql_server.main.id
    subresource_names              = ["sqlServer"]
    is_manual_connection           = false
  }

  tags = local.common_tags
}

resource "azurerm_private_endpoint" "redis" {
  name                = "pe-redis-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.data.id

  private_service_connection {
    name                           = "psc-redis-${local.resource_prefix}"
    private_connection_resource_id = azurerm_redis_cache.main.id
    subresource_names              = ["redisCache"]
    is_manual_connection           = false
  }

  tags = local.common_tags
}

# Private DNS Zones
resource "azurerm_private_dns_zone" "sql" {
  name                = "privatelink.database.windows.net"
  resource_group_name = azurerm_resource_group.main.name

  tags = local.common_tags
}

resource "azurerm_private_dns_zone" "redis" {
  name                = "privatelink.redis.cache.windows.net"
  resource_group_name = azurerm_resource_group.main.name

  tags = local.common_tags
}

# DNS Zone Links to VNet
resource "azurerm_private_dns_zone_virtual_network_link" "sql" {
  name                  = "dnslink-sql-${local.resource_prefix}"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.sql.name
  virtual_network_id    = azurerm_virtual_network.main.id
  registration_enabled  = false

  tags = local.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "redis" {
  name                  = "dnslink-redis-${local.resource_prefix}"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.redis.name
  virtual_network_id    = azurerm_virtual_network.main.id
  registration_enabled  = false

  tags = local.common_tags
}

# Private DNS A Records
resource "azurerm_private_dns_a_record" "sql" {
  name                = azurerm_mssql_server.main.name
  zone_name           = azurerm_private_dns_zone.sql.name
  resource_group_name = azurerm_resource_group.main.name
  ttl                 = 300
  records             = [azurerm_private_endpoint.sql.private_service_connection[0].private_ip_address]
}

resource "azurerm_private_dns_a_record" "redis" {
  name                = azurerm_redis_cache.main.name
  zone_name           = azurerm_private_dns_zone.redis.name
  resource_group_name = azurerm_resource_group.main.name
  ttl                 = 300
  records             = [azurerm_private_endpoint.redis.private_service_connection[0].private_ip_address]
}

# ============================================================
# Azure Front Door + WAF
# Premium SKU in production for WAF support
# ============================================================

resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "afd-${local.resource_prefix}"
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = var.environment == "production" ? "Premium_AzureFrontDoor" : "Standard_AzureFrontDoor"

  tags = local.common_tags
}

# --- Endpoints ---

resource "azurerm_cdn_frontdoor_endpoint" "provider_portal" {
  name                     = "fde-provider-${local.resource_prefix}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  tags = local.common_tags
}

resource "azurerm_cdn_frontdoor_endpoint" "patient_portal" {
  name                     = "fde-patient-${local.resource_prefix}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  tags = local.common_tags
}

resource "azurerm_cdn_frontdoor_endpoint" "orders_api" {
  name                     = "fde-api-${local.resource_prefix}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  tags = local.common_tags
}

# --- Origin Groups ---

resource "azurerm_cdn_frontdoor_origin_group" "provider_portal" {
  name                     = "og-provider-${local.resource_prefix}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = false

  health_probe {
    path                = "/api/health"
    protocol            = "Https"
    interval_in_seconds = 30
  }

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }
}

resource "azurerm_cdn_frontdoor_origin_group" "patient_portal" {
  name                     = "og-patient-${local.resource_prefix}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = false

  health_probe {
    path                = "/api/health"
    protocol            = "Https"
    interval_in_seconds = 30
  }

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }
}

resource "azurerm_cdn_frontdoor_origin_group" "orders_api" {
  name                     = "og-api-${local.resource_prefix}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = false

  health_probe {
    path                = "/health/live"
    protocol            = "Https"
    interval_in_seconds = 30
  }

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }
}

# --- Origins ---

resource "azurerm_cdn_frontdoor_origin" "provider_portal" {
  name                          = "origin-provider-${local.resource_prefix}"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.provider_portal.id
  enabled                       = true

  host_name          = azurerm_linux_web_app.provider_portal.default_hostname
  http_port          = 80  # Required by Azure CDN schema; actual traffic uses HTTPS-only via forwarding_protocol
  https_port         = 443
  origin_host_header = azurerm_linux_web_app.provider_portal.default_hostname
  certificate_name_check_enabled = true
}

resource "azurerm_cdn_frontdoor_origin" "patient_portal" {
  name                          = "origin-patient-${local.resource_prefix}"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.patient_portal.id
  enabled                       = true

  host_name          = azurerm_linux_web_app.patient_portal.default_hostname
  http_port          = 80  # Required by Azure CDN schema; actual traffic uses HTTPS-only via forwarding_protocol
  https_port         = 443
  origin_host_header = azurerm_linux_web_app.patient_portal.default_hostname
  certificate_name_check_enabled = true
}

resource "azurerm_cdn_frontdoor_origin" "orders_api" {
  name                          = "origin-api-${local.resource_prefix}"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.orders_api.id
  enabled                       = true

  host_name          = azurerm_linux_web_app.orders_api.default_hostname
  http_port          = 80  # Required by Azure CDN schema; actual traffic uses HTTPS-only via forwarding_protocol
  https_port         = 443
  origin_host_header = azurerm_linux_web_app.orders_api.default_hostname
  certificate_name_check_enabled = true
}

# --- Routes ---

resource "azurerm_cdn_frontdoor_route" "provider_portal" {
  name                          = "route-provider-${local.resource_prefix}"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.provider_portal.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.provider_portal.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.provider_portal.id]

  supported_protocols    = ["Https"]
  patterns_to_match      = ["/*"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  link_to_default_domain = true
}

resource "azurerm_cdn_frontdoor_route" "patient_portal" {
  name                          = "route-patient-${local.resource_prefix}"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.patient_portal.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.patient_portal.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.patient_portal.id]

  supported_protocols    = ["Https"]
  patterns_to_match      = ["/*"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  link_to_default_domain = true
}

resource "azurerm_cdn_frontdoor_route" "orders_api" {
  name                          = "route-api-${local.resource_prefix}"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.orders_api.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.orders_api.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.orders_api.id]

  supported_protocols    = ["Https"]
  patterns_to_match      = ["/*"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  link_to_default_domain = true
}

# --- WAF Policy (Production only — requires Premium SKU) ---

resource "azurerm_cdn_frontdoor_firewall_policy" "main" {
  name                              = "wafpol${var.project_name}${var.environment}"
  resource_group_name               = azurerm_resource_group.main.name
  sku_name                          = azurerm_cdn_frontdoor_profile.main.sku_name
  enabled                           = true
  mode                              = "Prevention"

  # Rate limiting: 100 requests per 5 minutes per IP
  custom_rule {
    name     = "RateLimitPerIP"
    enabled  = true
    priority = 100
    type     = "RateLimitRule"
    action   = "Block"

    rate_limit_duration_in_minutes = 5
    rate_limit_threshold           = 100

    match_condition {
      match_variable     = "RemoteAddr"
      operator           = "IPMatch"
      negation_condition = false
      match_values       = ["0.0.0.0/0"]
    }
  }

  # Managed rule: Default Rule Set
  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"
    action  = "Block"
  }

  # Managed rule: Bot Manager Rule Set
  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
    action  = "Block"
  }

  tags = local.common_tags
}

# Security policy linking WAF to all Front Door endpoints
resource "azurerm_cdn_frontdoor_security_policy" "main" {
  name                     = "secpol-${local.resource_prefix}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.main.id

      association {
        patterns_to_match = ["/*"]

        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.provider_portal.id
        }

        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.patient_portal.id
        }

        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.orders_api.id
        }
      }
    }
  }
}

# ============================================================
# Azure Monitor Alerts
# ============================================================

resource "azurerm_monitor_action_group" "critical" {
  name                = "ag-critical-${local.resource_prefix}"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "Critical"

  email_receiver {
    name          = "ops-email"
    email_address = var.alert_email
  }

  tags = local.common_tags
}

# Alert: API response time > 2 seconds
resource "azurerm_monitor_metric_alert" "api_response_time" {
  name                = "alert-api-response-time-${local.resource_prefix}"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_linux_web_app.orders_api.id]
  description         = "Orders API average response time exceeds 2 seconds"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "HttpResponseTime"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 2
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }

  tags = local.common_tags
}

# Alert: HTTP 5xx errors > 5 in 5 minutes
resource "azurerm_monitor_metric_alert" "api_5xx_errors" {
  name                = "alert-api-5xx-${local.resource_prefix}"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_linux_web_app.orders_api.id]
  description         = "Orders API HTTP 5xx errors exceed threshold"
  severity            = 1
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "Http5xx"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 5
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }

  tags = local.common_tags
}

# Alert: SQL DTU consumption > 90%
resource "azurerm_monitor_metric_alert" "sql_dtu" {
  name                = "alert-sql-dtu-${local.resource_prefix}"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_mssql_database.main.id]
  description         = "SQL Database DTU consumption exceeds 90%"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Sql/servers/databases"
    metric_name      = "dtu_consumption_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 90
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }

  tags = local.common_tags
}

# Alert: Redis memory usage > 80%
resource "azurerm_monitor_metric_alert" "redis_memory" {
  name                = "alert-redis-memory-${local.resource_prefix}"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_redis_cache.main.id]
  description         = "Redis cache memory usage exceeds 80%"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Cache/redis"
    metric_name      = "usedmemorypercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }

  tags = local.common_tags
}

# ============================================================
# Deployment Slots — Blue-Green for all three App Services
# Each service gets a "staging" slot that receives new deploys.
# CI deploys here, runs smoke tests, then swaps to production.
# ============================================================

# Provider Portal — staging slot
resource "azurerm_linux_web_app_slot" "provider_portal_staging" {
  name           = "staging"
  app_service_id = azurerm_linux_web_app.provider_portal.id
  https_only     = true

  site_config {
    always_on           = false
    http2_enabled       = true
    minimum_tls_version = "1.2"
    health_check_path   = "/api/health"

    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = azurerm_linux_web_app.provider_portal.app_settings

  identity {
    type = "SystemAssigned"
  }

  tags = local.common_tags
}

resource "azurerm_key_vault_access_policy" "provider_portal_slot" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app_slot.provider_portal_staging.identity[0].principal_id

  secret_permissions = ["Get", "List"]
}

# Patient Portal — staging slot
resource "azurerm_linux_web_app_slot" "patient_portal_staging" {
  name           = "staging"
  app_service_id = azurerm_linux_web_app.patient_portal.id
  https_only     = true

  site_config {
    always_on           = false
    http2_enabled       = true
    minimum_tls_version = "1.2"
    health_check_path   = "/api/health"

    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = azurerm_linux_web_app.patient_portal.app_settings

  identity {
    type = "SystemAssigned"
  }

  tags = local.common_tags
}

resource "azurerm_key_vault_access_policy" "patient_portal_slot" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app_slot.patient_portal_staging.identity[0].principal_id

  secret_permissions = ["Get", "List"]
}

# Orders API — staging slot
resource "azurerm_linux_web_app_slot" "orders_api_staging" {
  name           = "staging"
  app_service_id = azurerm_linux_web_app.orders_api.id
  https_only     = true

  site_config {
    always_on           = false
    http2_enabled       = true
    minimum_tls_version = "1.2"
    health_check_path   = "/health/ready"
    websocket_enabled   = true

    application_stack {
      dotnet_version = "8.0"
    }
  }

  app_settings = azurerm_linux_web_app.orders_api.app_settings

  identity {
    type = "SystemAssigned"
  }

  tags = local.common_tags
}

resource "azurerm_key_vault_access_policy" "orders_api_slot" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app_slot.orders_api_staging.identity[0].principal_id

  secret_permissions = ["Get", "List"]
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

# Staging slot URLs — used by CI to health-check before swapping
output "provider_portal_staging_url" {
  value = "https://${azurerm_linux_web_app_slot.provider_portal_staging.default_hostname}"
}

output "patient_portal_staging_url" {
  value = "https://${azurerm_linux_web_app_slot.patient_portal_staging.default_hostname}"
}

output "orders_api_staging_url" {
  value = "https://${azurerm_linux_web_app_slot.orders_api_staging.default_hostname}"
}

output "front_door_endpoint" {
  value = {
    provider_portal = azurerm_cdn_frontdoor_endpoint.provider_portal.host_name
    patient_portal  = azurerm_cdn_frontdoor_endpoint.patient_portal.host_name
    orders_api      = azurerm_cdn_frontdoor_endpoint.orders_api.host_name
  }
}

output "vnet_id" {
  value = azurerm_virtual_network.main.id
}

output "application_insights_connection_string" {
  value     = azurerm_application_insights.main.connection_string
  sensitive = true
}
