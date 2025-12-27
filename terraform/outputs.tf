output "cloud_run_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.baxpro.uri
}

output "artifact_registry_url" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/baxpro"
}

output "database_instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.baxpro_db.name
}

output "database_connection_name" {
  description = "Cloud SQL instance connection name"
  value       = google_sql_database_instance.baxpro_db.connection_name
}

output "service_account_email" {
  description = "Service account email for Cloud Run"
  value       = google_service_account.baxpro_runner.email
}

output "secret_session_secret_id" {
  description = "Secret Manager secret ID for session secret"
  value       = google_secret_manager_secret.session_secret.secret_id
}

output "secret_database_url_id" {
  description = "Secret Manager secret ID for database URL"
  value       = google_secret_manager_secret.database_url.secret_id
}

output "custom_domain" {
  description = "Custom domain (if configured)"
  value       = var.custom_domain != "" ? var.custom_domain : "Not configured"
}

output "ssl_certificate_id" {
  description = "Managed SSL certificate ID"
  value       = var.custom_domain != "" ? google_compute_managed_ssl_certificate.ssl_cert[0].certificate_id : null
}

output "load_balancer_ip" {
  description = "Load Balancer IP address - Point your DNS A record to this IP"
  value       = google_compute_global_address.lb_ip.address
}

output "dns_configuration_instructions" {
  description = "DNS records to configure for custom domain"
  value = var.custom_domain != "" ? {
    domain     = var.custom_domain
    message    = "Add this DNS A record to your domain registrar:"
    ip_address = google_compute_global_address.lb_ip.address
    record     = "A @ ${google_compute_global_address.lb_ip.address}"
  } : null
}
