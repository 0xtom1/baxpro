#!/bin/sh
# If permission denied, run: chmod +x /workspaces/baxus-monitor/scripts/*.sh
# Authenticate and configure gcloud using GCP_PROJECT_ID environment variable
# Requires: GCP_PROJECT_ID env var to be set

# Fail fast if required env var is missing
: "${GCP_PROJECT_ID:?Error: GCP_PROJECT_ID environment variable is not set}"

echo "Authenticating with gcloud..."

# Only run application-default login if no active ADC credentials exist
if ! gcloud auth application-default print-access-token &> /dev/null; then
  echo "No Application Default Credentials found. Opening browser for login..."
  gcloud auth application-default login
else
  echo "Application Default Credentials already available."
fi

# Set the default project for gcloud CLI commands
gcloud config set project "$GCP_PROJECT_ID"
echo "Set gcloud default project to: $GCP_PROJECT_ID"

# Set the quota project for Application Default Credentials (ADC)
# This ensures billing/quota is correctly attributed and avoids warnings/errors
gcloud auth application-default set-quota-project "$GCP_PROJECT_ID"
echo "Set ADC quota project to: $GCP_PROJECT_ID"

echo "gcloud is ready!"