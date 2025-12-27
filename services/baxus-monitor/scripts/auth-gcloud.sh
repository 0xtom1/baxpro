#!/bin/sh
# If permission denied, run: chmod +x /workspaces/baxus-monitor/scripts/*.sh

echo "Authenticating with gcloud..."

# Only login if not already authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "No active account. Opening browser for login..."
  gcloud auth application-default login
else
  echo "Already logged in."
fi

gcloud config set project "$GCP_PROJECT_ID"
gcloud auth application-default set-quota-project "$GCP_PROJECT_ID"

echo "gcloud is ready!"

# /usr/local/bin/auth-gcloud.sh