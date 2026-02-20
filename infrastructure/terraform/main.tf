# ============================================================
# ATTENDING AI - Azure Infrastructure (Terraform)
# infrastructure/terraform/main.tf
#
# Core infrastructure provisioning for ATTENDING AI platform.
# Includes reserved instances for cost optimization.
#
# Estimated savings: $5,000-7,000/year on always-on workloads
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
# App Service Plan - Reserved Instance (1-Year)
# Using P2v3 for production workloads
# Savings: ~35% vs pay-as-you-go pricing
# ============================================================

resource "azurerm_service_plan" "main" {
  name                = "asp-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "P2v3"
  
  tags = merge(local.common_tags, {
    Reservation = "1-year-reserved"
    # NOTE: Azure Reserved Instances are purchased separately via Azure Portal
    # or az CLI. This Terraform config provisions the always-on plan that
    # benefits from the reservation pricing.
    # Purchase command:
    # az reservations reservation-order purchase \
    #   --sku Standard_P2v3 --quantity 1 --term P1Y \
    #   --billing-scope-id /subscriptions/{sub-id}
  })
}

# ============================================================
# App Service - Provider Portal
# ============================================================

resource "azurerm_linux_web_app" "provider_portal" {
  name                = "app-${local.resource_prefix}-provider"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id
  
  site_config {
    always_on                = true
    http2_enabled            = true
    minimum_tls_version      = "1.2"
    health_check_path        = "/api/health"
    
    application_stack {
      node_version = "20-lts"
    }
  }
  
  app_settings = {
    "WEBSITE_NODE_DEFAULT_VERSION" = "~20"
    "NODE_ENV"                      = "production"
    "NEXT_TELEMETRY_DISABLED"       = "1"
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
  service_plan_id     = azurerm_service_plan.main.id
  
  site_config {
    always_on                = true
    http2_enabled            = true
    minimum_tls_version      = "1.2"
    health_check_path        = "/api/health"
    
    application_stack {
      node_version = "20-lts"
    }
  }
  
  tags = local.common_tags
}

# ============================================================
# PostgreSQL Flexible Server - Reserved (1-Year)
# D4s_v3: 4 vCores, 16GB RAM
# Savings: ~35% vs pay-as-you-go
# ============================================================

resource "azurerm_postgresql_flexible_server" "main" {
  name                          = "psql-${local.resource_prefix}"
  location                      = azurerm_resource_group.main.location
  resource_group_name           = azurerm_resource_group.main.name
  version                       = "16"
  administrator_login           = "attendingadmin"
  administrator_password        = var.db_admin_password
  storage_mb                    = 65536  # 64GB
  sku_name                      = "GP_Standard_D4s_v3"
  zone                          = "1"
  backup_retention_days         = 35     # HIPAA: retain backups
  geo_redundant_backup_enabled  = true   # DR compliance
  
  high_availability {
    mode = "ZoneRedundant"
  }
  
  tags = merge(local.common_tags, {
    Reservation = "1-year-reserved"
    # Purchase reservation:
    # az reservations reservation-order purchase \
    #   --sku GP_Gen5_4 --quantity 1 --term P1Y
  })
}

variable "db_admin_password" {
  description = "PostgreSQL admin password"
  type        = string
  sensitive   = true
}

# ============================================================
# Redis Cache - Sessions, Rate Limiting, AI Response Cache
# ============================================================

resource "azurerm_redis_cache" "main" {
  name                = "redis-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 1
  family              = "C"
  sku_name            = "Standard"
  minimum_tls_version = "1.2"
  
  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }
  
  tags = local.common_tags
}

# ============================================================
# Storage Account - PHI Audit Log Archival
# HIPAA requires 6-year retention
# Hot → Cool (90 days) → Cold/Archive (1 year)
# Reduces storage costs by ~70%
# ============================================================

resource "azurerm_storage_account" "audit_logs" {
  name                     = "st${var.project_name}audit${var.environment}"
  location                 = azurerm_resource_group.main.location
  resource_group_name      = azurerm_resource_group.main.name
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant for compliance
  min_tls_version          = "TLS1_2"
  
  blob_properties {
    versioning_enabled = true
    
    delete_retention_policy {
      days = 365  # 1-year soft delete for compliance
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

# ============================================================
# Lifecycle Management Policy - Audit Log Archival
# 
# Tier schedule:
#   0-90 days:   Hot tier (fast access for active investigations)
#   90-365 days: Cool tier (cheaper, slightly slower)
#   365+ days:   Archive tier (cheapest, rehydration required)
#   2190 days:   Delete (6 years = HIPAA minimum)
# ============================================================

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
        delete_after_days_since_modification_greater_than          = 2190  # 6 years
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

output "postgresql_fqdn" {
  value     = azurerm_postgresql_flexible_server.main.fqdn
  sensitive = true
}

output "redis_hostname" {
  value     = azurerm_redis_cache.main.hostname
  sensitive = true
}

output "audit_storage_account" {
  value = azurerm_storage_account.audit_logs.name
}
