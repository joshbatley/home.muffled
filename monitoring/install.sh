#!/usr/bin/env bash
set -euo pipefail

GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
NC="\033[0m"

echo -e "${GREEN}==> Installing prerequisites (Homebrew + node_exporter)${NC}"

# Ensure Homebrew
if ! command -v brew >/dev/null 2>&1; then
    echo -e "${YELLOW}Homebrew not found. Installing...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Load brew into current shell
    if [[ -d /opt/homebrew/bin ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -d /usr/local/bin ]]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
else
    echo -e "${GREEN}Homebrew found.${NC}"
fi

# Update brew
echo -e "${GREEN}==> brew update${NC}"
brew update

# Install node_exporter
if brew list --formula | grep -qx node_exporter; then
    echo -e "${GREEN}node_exporter already installed${NC}"
else
    echo -e "${GREEN}==> brew install node_exporter${NC}"
    brew install node_exporter
fi

# Start node_exporter with default settings (no plist edits)
echo -e "${GREEN}==> Starting node_exporter via brew services${NC}"
brew services start node_exporter || brew services restart node_exporter || true

# Quick check
echo -e "${GREEN}==> Verifying node_exporter endpoint${NC}"
sleep 2
if curl -fsS http://127.0.0.1:9100/metrics >/dev/null; then
    echo -e "${GREEN}node_exporter is responding on 127.0.0.1:9100${NC}"
else
    echo -e "${YELLOW}Warning: couldn't reach http://127.0.0.1:9100/metrics yet.${NC}"
    echo -e "Check: brew services list | grep node_exporter"
fi

# Bring up your existing Docker Compose stack (assumes docker-compose.yml present)
echo -e "${GREEN}==> Starting Docker Compose stack${NC}"
if command -v docker compose >/dev/null 2>&1; then
    docker compose up -d
else
    # Fallback to legacy docker-compose if needed
    docker-compose up -d
fi

echo -e "${GREEN}Done.${NC}"
echo -e "* node_exporter metrics: http://localhost:9100/metrics"
echo -e "* Prometheus:           http://localhost:9090"
echo -e "* Grafana:              http://localhost:3000"
