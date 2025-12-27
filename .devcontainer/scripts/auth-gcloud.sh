#!/bin/sh
echo "Authenticating with gcloud..."

# Only login if not already authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "No active account. Opening browser for login..."
  gcloud auth application-default login
else
  echo "Already logged in."
fi

gcloud config set project "$GCLOUD_PROJECT"
gcloud auth application-default set-quota-project "$GCLOUD_PROJECT"

echo "gcloud is ready!"