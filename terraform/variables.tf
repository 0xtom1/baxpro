variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (e.g., staging, production)"
  type        = string
  default     = "production"
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

# Database configuration
variable "db_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-f1-micro" # Free tier eligible, upgrade to db-custom-1-3840 for production
}

variable "db_disk_size" {
  description = "Database disk size in GB"
  type        = number
  default     = 10
}

# Cloud Run configuration
variable "cloud_run_cpu" {
  description = "CPU allocation for Cloud Run"
  type        = string
  default     = "1"
}

variable "cloud_run_memory" {
  description = "Memory allocation for Cloud Run"
  type        = string
  default     = "512Mi"
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0 # Scale to zero for cost savings
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

# Custom domain configuration
variable "custom_domain" {
  description = "Custom domain name (e.g., baxpro.xyz). Leave empty to skip domain mapping."
  type        = string
  default     = "" # Disabled until service account is added to Search Console
}

# Backend services configuration
variable "enable_alert_processor" {
  description = "Enable alert processor service"
  type        = bool
  default     = false
}

# Backend services configuration
variable "enable_alert_sender" {
  description = "Enable alert processor service"
  type        = bool
  default     = true
}

# Google OAuth configuration
variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

# Baxus Monitor configuration
variable "enable_baxus_monitor" {
  description = "Enable Baxus Monitor service"
  type        = bool
  default     = false
}

variable "baxus_monitor_image_tag" {
  description = "Docker image tag for Baxus Monitor service"
  type        = string
  default     = "latest"
}

variable "baxus_poll_interval_sec" {
  description = "Polling interval in seconds for Baxus API (default: 300 for dev, 30 for prod)"
  type        = number
  default     = null # Will use environment-based default if not set
}

variable "baxus_api_base" {
  description = "Baxus API base URL"
  type        = string
  default     = "https://services.baxus.co/api"
}

variable "baxus_monitor_source_hash" {
  description = "Hash of Baxus Monitor source code to force redeployment on changes"
  type        = string
  default     = "latest"
}

variable "alert_processor_source_hash" {
  description = "Hash of Alert Processor source code to force redeployment on changes"
  type        = string
  default     = "latest"
}

variable "alert_sender_source_hash" {
  description = "Hash of Alert Sender source code to force redeployment on changes"
  type        = string
  default     = "latest"
}

variable "sendgrid_api_key" {
  description = "SendGrid API key for sending email notifications"
  type        = string
  sensitive   = true
}

variable "gemini_api_key" {
  description = "Gemini API key for AI features in Baxus Monitor"
  type        = string
  sensitive   = true
  default     = ""
}

variable "helius_api_key" {
  description = "Helius API key for Solana blockchain activity tracking in Baxus Monitor"
  type        = string
  sensitive   = true
  default     = ""
}

variable "authorized_home_ip" {
  description = "Authorized home IP address for dev database access (CIDR format, e.g., 1.2.3.4/32)"
  type        = string
  sensitive   = true
  default     = ""
}