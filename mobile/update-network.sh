#!/usr/bin/env bash

set -euo pipefail

# Configuration
API_PORT=8080
ENV_FILE="${1:-.env}"
ENV_KEY="EXPO_PUBLIC_API_URL"

# Detect the connected Wi-Fi interface
WIFI_INTERFACE=$(
    nmcli -t -f DEVICE,TYPE,STATE device status |
    awk -F: '$2 == "wifi" && $3 == "connected" { print $1; exit }'
)

if [[ -z "$WIFI_INTERFACE" ]]; then
    echo "Error: No connected Wi-Fi interface found."
    exit 1
fi

# Get the IPv4 address assigned to that interface
IP_ADDRESS=$(
    ip -4 -o addr show dev "$WIFI_INTERFACE" scope global |
    awk 'NR == 1 { split($4, a, "/"); print a[1] }'
)

if [[ -z "$IP_ADDRESS" ]]; then
    echo "Error: No IPv4 address found for $WIFI_INTERFACE."
    exit 1
fi

API_URL="http://${IP_ADDRESS}:${API_PORT}"

# Create the environment file if it does not exist
touch "$ENV_FILE"

# Update the existing variable or append it if missing
if grep -q "^${ENV_KEY}=" "$ENV_FILE"; then
    sed -i "s|^${ENV_KEY}=.*|${ENV_KEY}=${API_URL}|" "$ENV_FILE"
else
    printf '\n%s=%s\n' "$ENV_KEY" "$API_URL" >> "$ENV_FILE"
fi

echo "Wi-Fi interface : $WIFI_INTERFACE"
echo "Detected IP     : $IP_ADDRESS"
echo "Updated API URL : $API_URL"
echo "Environment file: $ENV_FILE"