#!/usr/bin/env bash
set -euo pipefail

: "${ALG_BASE_URL:=${AOG_BASE_URL:?set ALG_BASE_URL (or legacy AOG_BASE_URL), e.g. http://localhost:11434}}"
: "${MODEL:?set MODEL, e.g. meta-llama/Llama-3.2-3B-Instruct}"

function get_json () {
  local url="$1"
  curl -fsS "$url" | python3 -m json.tool > /dev/null
}

function post_json () {
  local url="$1"
  local data="$2"
  curl -fsS -X POST "$url" \
    -H 'Content-Type: application/json' \
    -d "$data" | python3 -m json.tool > /dev/null
}

echo "== Smoke: GET /v1/models"
get_json "$ALG_BASE_URL/v1/models"
echo "  OK"

echo "== Smoke: POST /v1/chat/completions (non-stream)"
post_json "$ALG_BASE_URL/v1/chat/completions" \
  "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hi\"}],\"stream\":false}"
echo "  OK"

echo "== Smoke: POST /v1/chat/completions (stream) — checking SSE format"
FIRST_LINE=$(curl -N -sS "$ALG_BASE_URL/v1/chat/completions" \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hi\"}],\"stream\":true}" \
  | head -n 1)
if [[ "$FIRST_LINE" == data:* ]]; then
  echo "  OK (SSE format)"
else
  echo "  FAIL: expected 'data: ...' but got: $FIRST_LINE"
  exit 1
fi

echo
echo "All OpenAI-compatible smoke tests passed."
