# Terraform Backend Configuration
# 
# Terraform state is stored in Google Cloud Storage.
# Each environment uses its own bucket for complete isolation.
#
# Backend bucket is configured dynamically at init time via:
#   terraform init -backend-config="bucket=BUCKET_NAME"
#
# Production: ${PROJECT_ID}-terraform-state
# Development: ${PROJECT_ID_DEV}-terraform-state

terraform {
  backend "gcs" {
    # Bucket configured dynamically via -backend-config in CI/CD
    prefix = "terraform/state"
  }
}

# Setup Instructions:
#
# 1. Create the state bucket for each project:
#
#    # Production
#    gsutil mb -p YOUR_PROD_PROJECT -l us-central1 gs://YOUR_PROD_PROJECT-terraform-state
#    gsutil versioning set on gs://YOUR_PROD_PROJECT-terraform-state
#
#    # Development  
#    gsutil mb -p YOUR_DEV_PROJECT -l us-central1 gs://YOUR_DEV_PROJECT-terraform-state
#    gsutil versioning set on gs://YOUR_DEV_PROJECT-terraform-state
#
# 2. The CI/CD workflows will automatically use the correct bucket.
