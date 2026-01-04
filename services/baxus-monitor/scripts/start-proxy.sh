#!/bin/bash
# If permission denied, run: chmod +x /workspaces/baxus-monitor/scripts/*.sh
# Cloud SQL Auth Proxy startup script
# Reads configuration from environment variables:
#   GCP_PROJECT_ID, DB_INSTANCE, DB_NAME, DB_USER, DB_PASS
#
# Optional: you can still override the port via argument
#   ./start-proxy.sh 5433

# Required environment variables
: "${GCP_PROJECT_ID:?Error: GCP_PROJECT_ID is not set}"
: "${DB_INSTANCE:?Error: DB_INSTANCE is not set}"
: "${DATABASE_URL:?Error: DATABASE_URL is not set}"
: "${REGION:?Error: REGION is not set}"

# Build the full Cloud SQL instance connection string
INSTANCE="${GCP_PROJECT_ID}:${REGION}:${DB_INSTANCE}"  # adjust region if needed

# Port: use argument if provided, otherwise default to 5432
PORT="${1:-5432}"

PROXY_PATH="./cloud-sql-proxy"

# Download proxy if it doesn't exist
if [ ! -f "$PROXY_PATH" ]; then
    echo "Downloading Cloud SQL Auth Proxy..."
    curl -o "$PROXY_PATH" https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.0/cloud-sql-proxy.linux.amd64
    chmod +x "$PROXY_PATH"
    echo "Downloaded successfully."
fi

# Check if application default credentials are available
if ! gcloud auth application-default print-access-token &> /dev/null; then
    echo "No Application Default Credentials found."
    echo "Running: gcloud auth application-default login"
    gcloud auth application-default login
fi

echo ""
echo "Starting Cloud SQL Proxy..."
echo "  Project:   $GCP_PROJECT_ID"
echo "  Region:    $REGION"
echo "  Instance:  $DB_INSTANCE"
echo "  Full connection string: $INSTANCE"
echo "  Local port: $PORT"
echo ""
echo "Connect with:"
echo "  psql ${DATABASE_URL}"
echo ""
echo "Press Ctrl+C to stop."
echo ""

# Start the proxy
$PROXY_PATH "$INSTANCE" --port "$PORT"