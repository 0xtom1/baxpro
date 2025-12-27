#!/bin/bash
# If permission denied, run: chmod +x /workspaces/baxus-monitor/scripts/*.sh

# Cloud SQL Auth Proxy startup script
# Usage: ./start-proxy.sh [instance] [port]
#
# Examples:
#   ./start-proxy.sh                                              # Uses defaults
#   ./start-proxy.sh YOUR_PROJECT:us-central1:YOUR_DB_INSTANCE 5432   # Custom instance

INSTANCE="${1:-YOUR_PROJECT_ID:us-central1:YOUR_DB_INSTANCE}"
PORT="${2:-5432}"
PROXY_PATH="./cloud-sql-proxy"

# Download proxy if not exists
if [ ! -f "$PROXY_PATH" ]; then
    echo "Downloading Cloud SQL Auth Proxy..."
    curl -o "$PROXY_PATH" https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.0/cloud-sql-proxy.linux.amd64
    chmod +x "$PROXY_PATH"
    echo "Downloaded successfully."
fi

# Check if gcloud is authenticated
if ! gcloud auth application-default print-access-token &> /dev/null; then
    echo "Not authenticated. Running gcloud auth..."
    gcloud auth application-default login
fi

echo ""
echo "Starting Cloud SQL Proxy..."
echo "  Instance: $INSTANCE"
echo "  Port: $PORT"
echo ""
echo "Connect with:"
echo "  psql postgresql://\$DB_USER:\$DB_PASS@localhost:$PORT/\$DB_NAME"
echo ""
echo "Press Ctrl+C to stop."
echo ""

$PROXY_PATH "$INSTANCE" --port "$PORT"
