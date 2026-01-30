terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    null = { # Prevent error if state still references it
      source  = "hashicorp/null"
      version = ">= 3.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "servicenetworking.googleapis.com",
    "compute.googleapis.com",
    "vpcaccess.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "eventarc.googleapis.com",
    "pubsub.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

# ============================================================================
# NETWORKING INFRASTRUCTURE (created per-project)
# ============================================================================

# PSA peering (required for private IP)
# These networking resources are critical infrastructure - never destroy or modify
resource "google_compute_global_address" "psa_range" {
  name          = "cloud-sql-psa-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = "projects/${var.project_id}/global/networks/default"

  lifecycle {
    prevent_destroy = true
    ignore_changes  = all
  }
}

resource "google_service_networking_connection" "psa_peering" {
  network                 = "projects/${var.project_id}/global/networks/default"
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = ["cloud-sql-psa-range"]

  depends_on = [google_compute_global_address.psa_range]

  lifecycle {
    prevent_destroy = true
    ignore_changes  = all
  }
}

# Serverless VPC Connector
resource "google_vpc_access_connector" "baxpro" {
  name          = "baxpro-vpc-connector"
  region        = var.region
  network       = "default"
  ip_cidr_range = "10.8.0.0/28"

  min_instances = 2
  max_instances = 3

  depends_on = [google_project_service.apis]
}

# Firewall rule
resource "google_compute_firewall" "vpc_connector_to_cloudsql" {
  name    = "allow-vpc-connector-to-cloudsql"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }

  source_ranges = ["10.8.0.0/28"]
  target_tags   = []

  description = "Allow VPC Connector to reach Cloud SQL private IP"

  depends_on = [google_project_service.apis]
}

# Note: Artifact Registry is created by the GitHub workflow before Docker push
# This avoids chicken-and-egg issues with image availability for Cloud Run

# ============================================================================
# DATABASE
# ============================================================================

# Cloud SQL instance — private only, password auth only
resource "google_sql_database_instance" "baxpro_db" {
  name             = "baxpro-db-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = var.db_tier
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_size         = var.db_disk_size

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = var.environment == "production"
      transaction_log_retention_days = 7
      backup_retention_settings { retained_backups = 7 }
    }

    ip_configuration {
      ipv4_enabled    = var.environment != "production" # Public IP for dev only
      private_network = "projects/${var.project_id}/global/networks/default"

      # Allow connections only from specific IPs for dev
      dynamic "authorized_networks" {
        for_each = var.environment != "production" && var.authorized_home_ip != "" ? [1] : []
        content {
          name  = "authorized-home"
          value = var.authorized_home_ip
        }
      }
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }

  deletion_protection = var.environment == "production"
  depends_on = [
    google_project_service.apis,
    google_service_networking_connection.psa_peering
  ]
}

# Database
resource "google_sql_database" "baxpro" {
  name     = "baxpro"
  instance = google_sql_database_instance.baxpro_db.name
}

# DB user + password
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!"
  min_lower        = 1
  min_upper        = 1
  min_numeric      = 1
  min_special      = 0
}

resource "google_sql_user" "baxpro" {
  name     = "baxpro"
  instance = google_sql_database_instance.baxpro_db.name
  password = random_password.db_password.result
}

# ============================================================================
# SECRETS
# ============================================================================

# DATABASE_URL secret — with password + Unix socket
resource "google_secret_manager_secret" "database_url" {
  secret_id = "baxpro-database-url-${var.environment}"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://baxpro:${random_password.db_password.result}@localhost/baxpro?host=/cloudsql/${google_sql_database_instance.baxpro_db.connection_name}"
}

# Session secret
resource "random_password" "session_secret" {
  length  = 64
  special = true
}

resource "google_secret_manager_secret" "session_secret" {
  secret_id = "baxpro-session-secret-${var.environment}"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "session_secret" {
  secret      = google_secret_manager_secret.session_secret.id
  secret_data = random_password.session_secret.result
}

# OAuth secrets
resource "google_secret_manager_secret" "google_client_id" {
  secret_id = "baxpro-google-client-id-${var.environment}"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "google_client_id" {
  secret      = google_secret_manager_secret.google_client_id.id
  secret_data = var.google_client_id
}

resource "google_secret_manager_secret" "google_client_secret" {
  secret_id = "baxpro-google-client-secret-${var.environment}"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "google_client_secret" {
  secret      = google_secret_manager_secret.google_client_secret.id
  secret_data = var.google_client_secret
}

# DB credential secrets
resource "google_secret_manager_secret" "db_user" {
  secret_id = "baxpro-db-user-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_user" {
  secret      = google_secret_manager_secret.db_user.id
  secret_data = google_sql_user.baxpro.name
}

resource "google_secret_manager_secret" "db_pass" {
  secret_id = "baxpro-db-pass-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_pass" {
  secret      = google_secret_manager_secret.db_pass.id
  secret_data = random_password.db_password.result
}

resource "google_secret_manager_secret" "db_name" {
  secret_id = "baxpro-db-name-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_name" {
  secret      = google_secret_manager_secret.db_name.id
  secret_data = google_sql_database.baxpro.name
}

resource "google_secret_manager_secret" "instance_unix_socket" {
  secret_id = "baxpro-instance-unix-socket-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "instance_unix_socket" {
  secret      = google_secret_manager_secret.instance_unix_socket.id
  secret_data = "/cloudsql/${google_sql_database_instance.baxpro_db.connection_name}"
}

# SendGrid API key for email notifications
resource "google_secret_manager_secret" "sendgrid_api_key" {
  secret_id = "baxpro-sendgrid-api-key-${var.environment}"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "sendgrid_api_key" {
  secret      = google_secret_manager_secret.sendgrid_api_key.id
  secret_data = var.sendgrid_api_key
}

# Gemini API key for AI features in Baxus Monitor
resource "google_secret_manager_secret" "gemini_api_key" {
  count     = var.enable_baxus_monitor ? 1 : 0
  secret_id = "baxpro-gemini-api-key-${var.environment}"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "gemini_api_key" {
  count       = var.enable_baxus_monitor ? 1 : 0
  secret      = google_secret_manager_secret.gemini_api_key[0].id
  secret_data = var.gemini_api_key
}

# Helius API key for Solana blockchain activity tracking in Baxus Monitor
resource "google_secret_manager_secret" "helius_api_key" {
  count     = var.enable_baxus_monitor ? 1 : 0
  secret_id = "baxpro-helius-api-key-${var.environment}"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "helius_api_key" {
  count       = var.enable_baxus_monitor ? 1 : 0
  secret      = google_secret_manager_secret.helius_api_key[0].id
  secret_data = var.helius_api_key
}

# ============================================================================
# IAM
# ============================================================================

# Service account
resource "google_service_account" "baxpro_runner" {
  account_id   = "baxpro-runner-${var.environment}"
  display_name = "BaxPro Cloud Run Service Account"
}

resource "google_project_iam_member" "cloud_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.baxpro_runner.email}"
}

resource "google_project_iam_member" "cloud_sql_admin" {
  project = var.project_id
  role    = "roles/cloudsql.admin"
  member  = "serviceAccount:${google_service_account.baxpro_runner.email}"

  depends_on = [google_service_account.baxpro_runner]
}

resource "google_project_iam_member" "compute_viewer" {
  project = var.project_id
  role    = "roles/compute.viewer"
  member  = "serviceAccount:${google_service_account.baxpro_runner.email}"

  depends_on = [google_service_account.baxpro_runner]
}

resource "google_project_iam_member" "cloud_sql_instance_user" {
  project    = var.project_id
  role       = "roles/cloudsql.instanceUser"
  member     = "serviceAccount:${google_service_account.baxpro_runner.email}"
  depends_on = [google_service_account.baxpro_runner]
}

resource "google_project_iam_member" "baxpro_runner_serviceusage_admin" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageAdmin"
  member  = "serviceAccount:${google_service_account.baxpro_runner.email}"

  depends_on = [google_service_account.baxpro_runner]
}

# Grant main Cloud Run service permission to publish to alert-matches topic (for test emails)
resource "google_pubsub_topic_iam_member" "baxpro_runner_pubsub_publisher" {
  count  = var.enable_alert_processor ? 1 : 0
  topic  = google_pubsub_topic.alert_matches[0].name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.baxpro_runner.email}"

  depends_on = [
    google_service_account.baxpro_runner,
    google_pubsub_topic.alert_matches,
  ]
}

# Secret access - use static secret names to allow imports
locals {
  secret_names = [
    "baxpro-database-url-${var.environment}",
    "baxpro-session-secret-${var.environment}",
    "baxpro-google-client-id-${var.environment}",
    "baxpro-google-client-secret-${var.environment}",
    "baxpro-db-user-${var.environment}",
    "baxpro-db-pass-${var.environment}",
    "baxpro-db-name-${var.environment}",
    "baxpro-instance-unix-socket-${var.environment}",
  ]

  # Baxus Monitor polling interval: 5 min (300s) for dev, 30s for production
  baxus_poll_interval = var.baxus_poll_interval_sec != null ? var.baxus_poll_interval_sec : (var.environment == "production" ? 30 : 300)
}

resource "google_secret_manager_secret_iam_member" "secret_access" {
  for_each  = toset(local.secret_names)
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.baxpro_runner.email}"

  depends_on = [
    google_secret_manager_secret.database_url,
    google_secret_manager_secret.session_secret,
    google_secret_manager_secret.google_client_id,
    google_secret_manager_secret.google_client_secret,
    google_secret_manager_secret_version.db_user,
    google_secret_manager_secret_version.db_pass,
    google_secret_manager_secret_version.db_name,
    google_secret_manager_secret_version.instance_unix_socket,
  ]
}

# ============================================================================
# CLOUD RUN
# ============================================================================

# Allow unauthenticated public access by disabling invoker IAM check
# Cloud Run ingress setting still applies for network traffic so
# Traffic must come through the load balancer (ingress restriction still enforced)
# No IAM permission check happens for those requests

resource "null_resource" "allow_unauthenticated" {
  triggers = {
    image_tag = var.image_tag
  }

  provisioner "local-exec" {
    command = "gcloud run services update ${google_cloud_run_v2_service.baxpro.name} --region=${var.region} --project=${var.project_id} --no-invoker-iam-check"
  }

  depends_on = [google_cloud_run_v2_service.baxpro]
}

# Cloud Run — Unix socket + password auth
resource "google_cloud_run_v2_service" "baxpro" {
  name     = "baxpro-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = google_service_account.baxpro_runner.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = google_vpc_access_connector.baxpro.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/baxpro/baxpro:${var.image_tag}"

      ports { container_port = 8080 }

      resources {
        limits = {
          cpu    = var.cloud_run_cpu
          memory = var.cloud_run_memory
        }
      }
      env {
        name = "DB_USER"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_user.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "DB_PASS"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_pass.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "DB_NAME"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_name.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "INSTANCE_UNIX_SOCKET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.instance_unix_socket.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "DEPLOY_VERSION"
        value = var.image_tag
      }
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SESSION_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.session_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "GOOGLE_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.google_client_id.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "GOOGLE_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.google_client_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "CUSTOM_DOMAIN"
        value = var.custom_domain
      }

      # Pub/Sub topic for test email functionality (only set if alert processor is enabled)
      dynamic "env" {
        for_each = var.enable_alert_processor ? [1] : []
        content {
          name  = "PUBSUB_TOPIC_ALERT_MATCHES"
          value = "alert-matches-${var.environment}"
        }
      }

      # Unix socket mount for fast private connection
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.baxpro_db.connection_name]
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.apis,
    google_vpc_access_connector.baxpro,
    google_secret_manager_secret_version.db_user,
    google_secret_manager_secret_version.db_pass,
    google_secret_manager_secret_version.db_name,
    google_secret_manager_secret_version.instance_unix_socket,
  ]
}

# ============================================================================
# LOAD BALANCER
# ============================================================================

resource "google_compute_global_address" "lb_ip" {
  name = "baxpro-lb-ip-${var.environment}"
}

resource "google_compute_region_network_endpoint_group" "serverless_neg" {
  name                  = "baxpro-neg-${var.environment}"
  region                = var.region
  network_endpoint_type = "SERVERLESS"
  cloud_run { service = google_cloud_run_v2_service.baxpro.name }
}

resource "google_compute_backend_service" "backend" {
  name        = "baxpro-backend-${var.environment}"
  protocol    = "HTTP"
  timeout_sec = 30

  backend { group = google_compute_region_network_endpoint_group.serverless_neg.id }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

resource "google_compute_url_map" "url_map" {
  name            = "baxpro-url-map-${var.environment}"
  default_service = google_compute_backend_service.backend.id
}

resource "google_compute_managed_ssl_certificate" "ssl_cert" {
  count = var.custom_domain != "" ? 1 : 0
  name  = "baxpro-ssl-cert-${var.environment}"
  managed { domains = [var.custom_domain] }
}

resource "google_compute_target_https_proxy" "https_proxy" {
  count            = var.custom_domain != "" ? 1 : 0
  name             = "baxpro-https-proxy-${var.environment}"
  url_map          = google_compute_url_map.url_map.id
  ssl_certificates = google_compute_managed_ssl_certificate.ssl_cert[*].id
}

resource "google_compute_global_forwarding_rule" "https_forwarding_rule" {
  count      = var.custom_domain != "" ? 1 : 0
  name       = "baxpro-https-forwarding-rule-${var.environment}"
  target     = google_compute_target_https_proxy.https_proxy[0].id
  port_range = "443"
  ip_address = google_compute_global_address.lb_ip.address
}

resource "google_compute_url_map" "http_redirect" {
  count = var.custom_domain != "" ? 1 : 0
  name  = "baxpro-http-redirect-${var.environment}"
  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "http_proxy" {
  count   = var.custom_domain != "" ? 1 : 0
  name    = "baxpro-http-proxy-${var.environment}"
  url_map = google_compute_url_map.http_redirect[0].id
}

resource "google_compute_global_forwarding_rule" "http_forwarding_rule" {
  count      = var.custom_domain != "" ? 1 : 0
  name       = "baxpro-http-forwarding-rule-${var.environment}"
  target     = google_compute_target_http_proxy.http_proxy[0].id
  port_range = "80"
  ip_address = google_compute_global_address.lb_ip.address
}

# ============================================================================
# PUB/SUB - Listing Notifications
# ============================================================================

# Get project number for service agent emails
data "google_project" "current" {
  project_id = var.project_id
}

# New listings get published here
resource "google_pubsub_topic" "baxus_listings" {
  count = var.enable_baxus_monitor ? 1 : 0
  name  = "baxus-listings-${var.environment}"
}

# New listing matched to alerts get published here
resource "google_pubsub_topic" "alert_matches" {
  count = var.enable_alert_processor ? 1 : 0
  name  = "alert-matches-${var.environment}"
}

# Allow Pub/Sub service agent to create auth tokens for authenticated push
resource "google_project_iam_member" "pubsub_token_creator" {
  count   = var.enable_alert_processor && var.enable_baxus_monitor ? 1 : 0
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"

  depends_on = [google_project_service.apis]
}

# ============================================================================
# BAXUS MONITOR - Cloud Run Service
# ============================================================================

resource "google_service_account" "baxus_monitor" {
  count        = var.enable_baxus_monitor ? 1 : 0
  account_id   = "baxus-monitor-${var.environment}"
  display_name = "Baxus Monitor Service Account (${var.environment})"
}

resource "google_project_iam_member" "baxus_monitor_sql" {
  count   = var.enable_baxus_monitor ? 1 : 0
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.baxus_monitor[0].email}"
}

resource "google_project_iam_member" "baxus_monitor_secrets" {
  count   = var.enable_baxus_monitor ? 1 : 0
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.baxus_monitor[0].email}"
}

resource "google_project_iam_member" "baxus_monitor_pubsub" {
  count   = var.enable_baxus_monitor ? 1 : 0
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.baxus_monitor[0].email}"
}

resource "google_cloud_run_v2_service" "baxus_monitor" {
  count    = var.enable_baxus_monitor ? 1 : 0
  name     = "baxus-monitor-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = google_service_account.baxus_monitor[0].email

    annotations = {
      "source-hash" = var.baxus_monitor_source_hash
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 1
    }

    vpc_access {
      connector = google_vpc_access_connector.baxpro.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/baxpro/baxus-monitor:${var.baxus_monitor_image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      startup_probe {
        http_get {
          path = "/"
          port = 8080
        }
        initial_delay_seconds = 5
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 12
      }

      env {
        name = "DB_USER"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_user.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "DB_PASS"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_pass.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "DB_NAME"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_name.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "INSTANCE_UNIX_SOCKET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.instance_unix_socket.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "PUBSUB_TOPIC"
        value = google_pubsub_topic.baxus_listings[0].name
      }
      env {
        name  = "POLL_INTERVAL_SEC"
        value = tostring(local.baxus_poll_interval)
      }
      env {
        name  = "BAXUS_API_BASE"
        value = var.baxus_api_base
      }
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key[0].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "HELIUS_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.helius_api_key[0].secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.baxpro_db.connection_name]
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_vpc_access_connector.baxpro,
    google_secret_manager_secret_version.db_user,
    google_secret_manager_secret_version.db_pass,
    google_secret_manager_secret_version.db_name,
    google_secret_manager_secret_version.instance_unix_socket,
    google_pubsub_topic.baxus_listings,
  ]
}

# ============================================================================
# ALERT PROCESSOR - Cloud Function 2nd Gen (Pub/Sub triggered)
# ============================================================================

# Note: Functions source bucket is created by the CI workflow before Terraform runs
# Bucket name: ${var.project_id}-functions-source

resource "google_service_account" "alert_processor" {
  count        = var.enable_alert_processor ? 1 : 0
  account_id   = "alert-processor-${var.environment}"
  display_name = "Alert Processor Service Account (${var.environment})"
}

resource "google_project_iam_member" "alert_processor_sql" {
  count   = var.enable_alert_processor ? 1 : 0
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.alert_processor[0].email}"
}

resource "google_project_iam_member" "alert_processor_secrets" {
  count   = var.enable_alert_processor ? 1 : 0
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.alert_processor[0].email}"
}

resource "google_project_iam_member" "alert_processor_pubsub" {
  count   = var.enable_alert_processor ? 1 : 0
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.alert_processor[0].email}"
}

# Allow Eventarc to receive events
resource "google_project_iam_member" "alert_processor_eventarc" {
  count   = var.enable_alert_processor ? 1 : 0
  project = var.project_id
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${google_service_account.alert_processor[0].email}"
}

resource "google_project_iam_member" "pubsub_cloudfunctions_alert" {
  count = var.enable_alert_processor && var.enable_baxus_monitor ? 1 : 0

  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.alert_processor[0].email}"
}

resource "google_project_iam_member" "pubsub_cloudfunctions_monitor" {
  count = var.enable_alert_processor && var.enable_baxus_monitor ? 1 : 0

  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.baxus_monitor[0].email}"
}

resource "google_project_iam_member" "pubsub_runinvoker_alert" {
  count = var.enable_alert_processor && var.enable_baxus_monitor ? 1 : 0

  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.alert_processor[0].email}"
}

resource "google_project_iam_member" "pubsub_runinvoker_monitor" {
  count = var.enable_alert_processor && var.enable_baxus_monitor ? 1 : 0

  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.baxus_monitor[0].email}"
}

# Cloud Function 2nd Gen
resource "google_cloudfunctions2_function" "alert_processor" {
  count    = var.enable_alert_processor && var.enable_baxus_monitor ? 1 : 0
  name     = "alert-processor-${var.environment}"
  location = var.region

  build_config {
    runtime     = "python311"
    entry_point = "process_listing"
    source {
      storage_source {
        bucket = "${var.project_id}-functions-source"
        object = "alert-processor-${var.alert_processor_source_hash}.zip"
      }
    }
  }

  service_config {
    min_instance_count            = 0
    max_instance_count            = 10
    available_memory              = "512Mi"
    timeout_seconds               = 60
    service_account_email         = google_service_account.alert_processor[0].email
    ingress_settings              = "ALLOW_INTERNAL_ONLY"
    vpc_connector                 = google_vpc_access_connector.baxpro.id
    vpc_connector_egress_settings = "PRIVATE_RANGES_ONLY"

    environment_variables = {
      GCP_PROJECT_ID = var.project_id
      ENVIRONMENT    = var.environment
      PUBSUB_TOPIC   = google_pubsub_topic.alert_matches[0].name
      DB_HOST        = google_sql_database_instance.baxpro_db.private_ip_address
    }
    secret_environment_variables {
      key        = "INSTANCE_UNIX_SOCKET"
      project_id = var.project_id
      secret     = google_secret_manager_secret.instance_unix_socket.secret_id
      version    = "latest"
    }
    secret_environment_variables {
      key        = "DB_USER"
      project_id = var.project_id
      secret     = google_secret_manager_secret.db_user.secret_id
      version    = "latest"
    }
    secret_environment_variables {
      key        = "DB_PASS"
      project_id = var.project_id
      secret     = google_secret_manager_secret.db_pass.secret_id
      version    = "latest"
    }
    secret_environment_variables {
      key        = "DB_NAME"
      project_id = var.project_id
      secret     = google_secret_manager_secret.db_name.secret_id
      version    = "latest"
    }
  }

  event_trigger {
    trigger_region        = var.region
    event_type            = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic          = google_pubsub_topic.baxus_listings[0].id
    retry_policy          = "RETRY_POLICY_RETRY"
    service_account_email = google_service_account.alert_processor[0].email
  }

  depends_on = [
    google_project_service.apis,
    google_vpc_access_connector.baxpro,
    google_secret_manager_secret_version.db_user,
    google_secret_manager_secret_version.db_pass,
    google_secret_manager_secret_version.db_name,
    google_pubsub_topic.alert_matches,
    google_pubsub_topic.baxus_listings,
    google_project_iam_member.alert_processor_eventarc,
    google_project_iam_member.pubsub_runinvoker_alert,
    google_project_iam_member.pubsub_runinvoker_monitor,
    google_project_iam_member.pubsub_cloudfunctions_alert,
    google_project_iam_member.pubsub_cloudfunctions_monitor,
    google_project_iam_member.pubsub_token_creator,
  ]
}

# Allow alert processor SA to invoke its own Cloud Run service (for Eventarc trigger)
resource "google_cloud_run_service_iam_member" "alert_processor_invoker" {
  count    = var.enable_alert_processor && var.enable_baxus_monitor ? 1 : 0
  location = var.region
  service  = google_cloudfunctions2_function.alert_processor[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.alert_processor[0].email}"
}

# ============================================================================
# ALERT SENDER - Cloud Function 2nd Gen (Pub/Sub triggered)
# ============================================================================

# Note: Functions source bucket is created by the CI workflow before Terraform runs
# Bucket name: ${var.project_id}-functions-source

resource "google_service_account" "alert_sender" {
  count        = var.enable_alert_sender ? 1 : 0
  account_id   = "alert-sender-${var.environment}"
  display_name = "Alert Sender Service Account (${var.environment})"
}

resource "google_project_iam_member" "alert_sender_sql" {
  count   = var.enable_alert_sender ? 1 : 0
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.alert_sender[0].email}"
}

resource "google_project_iam_member" "alert_sender_secrets" {
  count   = var.enable_alert_sender ? 1 : 0
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.alert_sender[0].email}"
}

resource "google_project_iam_member" "alert_sender_pubsub" {
  count   = var.enable_alert_sender ? 1 : 0
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.alert_sender[0].email}"
}

# Allow Eventarc to receive events
resource "google_project_iam_member" "alert_sender_eventarc" {
  count   = var.enable_alert_sender ? 1 : 0
  project = var.project_id
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${google_service_account.alert_sender[0].email}"
}

resource "google_project_iam_member" "pubsub_cloudfunctions_alert_sender" {
  count = var.enable_alert_sender && var.enable_baxus_monitor ? 1 : 0

  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.alert_sender[0].email}"
}


resource "google_project_iam_member" "pubsub_runinvoker_sender" {
  count = var.enable_alert_sender && var.enable_baxus_monitor ? 1 : 0

  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.alert_sender[0].email}"
}


# Cloud Function 2nd Gen
resource "google_cloudfunctions2_function" "alert_sender" {
  count    = var.enable_alert_processor && var.enable_alert_sender ? 1 : 0
  name     = "alert-sender-${var.environment}"
  location = var.region

  build_config {
    runtime     = "python311"
    entry_point = "send_alert"
    source {
      storage_source {
        bucket = "${var.project_id}-functions-source"
        object = "alert-sender-${var.alert_sender_source_hash}.zip"
      }
    }
  }

  service_config {
    min_instance_count            = 0
    max_instance_count            = 10
    available_memory              = "512Mi"
    timeout_seconds               = 60
    service_account_email         = google_service_account.alert_sender[0].email
    ingress_settings              = "ALLOW_INTERNAL_ONLY"
    vpc_connector                 = google_vpc_access_connector.baxpro.id
    vpc_connector_egress_settings = "PRIVATE_RANGES_ONLY"

    environment_variables = {
      GCP_PROJECT_ID = var.project_id
      ENVIRONMENT    = var.environment
      DB_HOST        = google_sql_database_instance.baxpro_db.private_ip_address
    }
    secret_environment_variables {
      key        = "INSTANCE_UNIX_SOCKET"
      project_id = var.project_id
      secret     = google_secret_manager_secret.instance_unix_socket.secret_id
      version    = "latest"
    }
    secret_environment_variables {
      key        = "DB_USER"
      project_id = var.project_id
      secret     = google_secret_manager_secret.db_user.secret_id
      version    = "latest"
    }
    secret_environment_variables {
      key        = "DB_PASS"
      project_id = var.project_id
      secret     = google_secret_manager_secret.db_pass.secret_id
      version    = "latest"
    }
    secret_environment_variables {
      key        = "DB_NAME"
      project_id = var.project_id
      secret     = google_secret_manager_secret.db_name.secret_id
      version    = "latest"
    }
    secret_environment_variables {
      key        = "SENDGRID_API_KEY"
      project_id = var.project_id
      secret     = google_secret_manager_secret.sendgrid_api_key.secret_id
      version    = "latest"
    }
  }

  event_trigger {
    trigger_region        = var.region
    event_type            = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic          = google_pubsub_topic.alert_matches[0].id
    retry_policy          = "RETRY_POLICY_RETRY"
    service_account_email = google_service_account.alert_sender[0].email
  }

  depends_on = [
    google_project_service.apis,
    google_vpc_access_connector.baxpro,
    google_secret_manager_secret_version.db_user,
    google_secret_manager_secret_version.db_pass,
    google_secret_manager_secret_version.db_name,
    google_pubsub_topic.alert_matches,
    google_pubsub_topic.baxus_listings,
    google_project_iam_member.alert_sender_eventarc,
    google_project_iam_member.pubsub_cloudfunctions_alert_sender,
    google_project_iam_member.pubsub_runinvoker_sender,
    google_project_iam_member.pubsub_token_creator,
  ]
}

# Allow alert processor SA to invoke its own Cloud Run service (for Eventarc trigger)
resource "google_cloud_run_service_iam_member" "alert_sender_invoker" {
  count    = var.enable_alert_sender && var.enable_baxus_monitor ? 1 : 0
  location = var.region
  service  = google_cloudfunctions2_function.alert_sender[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.alert_sender[0].email}"
}
