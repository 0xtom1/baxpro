# Backend Services Infrastructure
#
# This file contains additional Pub/Sub infrastructure for alert processing.
# Note: Core alert-processor resources (service account, Cloud Function) are in main.tf

# Dead letter topic for failed alert messages
resource "google_pubsub_topic" "alert_matches_dlq" {
  count = var.enable_alert_processor ? 1 : 0

  name = "alert-matches-dlq-${var.environment}"
}

# Grant Pub/Sub permission to publish to DLQ
resource "google_pubsub_topic_iam_member" "pubsub_dlq_publisher" {
  count = var.enable_alert_processor ? 1 : 0

  topic  = google_pubsub_topic.alert_matches_dlq[0].name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Get project number for Pub/Sub service account
data "google_project" "project" {
  project_id = var.project_id
}
