#!/bin/bash
# If permission denied, run: chmod +x /workspaces/baxus-monitor/scripts/*.sh

# Run the Baxus Monitor service locally
# Must be run from the baxus-monitor directory (not src/)

cd "$(dirname "$0")/.." || exit 1

# Load .env if it exists
if [ -f .env ]; then
    echo "Loading .env file..."
    set -a
    source .env
    set +a
fi

echo "Starting Baxus Monitor..."
echo "  Environment: ${ENVIRONMENT:-dev}"
echo ""

# Run as a module so relative imports work
python -m src.main
