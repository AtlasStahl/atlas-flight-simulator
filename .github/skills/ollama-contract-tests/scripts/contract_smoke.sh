#!/usr/bin/env bash
set -euo pipefail

: "${OLLAMA_BASE_URL:?set OLLAMA_BASE_URL, e.g. http://localhost:11434}"
: "${ALG_BASE_URL:=${AOG_BASE_URL:?set ALG_BASE_URL (or legacy AOG_BASE_URL), e.g. http://localhost:11434}}"

function get_json () {
  local url="$1"
  curl -fsS "$url" | python -m json.tool > /dev/null
}

echo "== Smoke: /api/version"
get_json "$OLLAMA_BASE_URL/api/version"
get_json "$ALG_BASE_URL/api/version"

echo "== Smoke: /api/tags"
get_json "$OLLAMA_BASE_URL/api/tags"
get_json "$ALG_BASE_URL/api/tags"

echo "== Smoke: /api/ps"
get_json "$OLLAMA_BASE_URL/api/ps"
get_json "$ALG_BASE_URL/api/ps"

echo "OK"
