#!/usr/bin/env bash
set -e
REGION="${1:-JP}"
echo "[*] Testing Cloudflare IPs for region $REGION"
IPS=$(curl -s https://www.cloudflare.com/ips-v4 | head -n 30)
for ip in $IPS; do
  ms=$(curl -o /dev/null -s -w "%{time_connect}\n" --max-time 2 "https://$ip/" || echo 9)
  echo "$ms $ip"
done | sort -n | head -n 5
