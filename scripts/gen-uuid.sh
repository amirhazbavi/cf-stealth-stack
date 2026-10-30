#!/usr/bin/env bash
set -e
if command -v python3 >/dev/null; then
  python3 -c "import uuid;print(uuid.uuid4())"
elif command -v node >/dev/null; then
  node -e "console.log(require('crypto').randomUUID())"
else
  echo "python3 or node required" >&2; exit 1
fi
