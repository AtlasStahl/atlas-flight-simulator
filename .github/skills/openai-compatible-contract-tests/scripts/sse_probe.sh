#!/usr/bin/env bash
set -euo pipefail

: "${ALG_BASE_URL:=${AOG_BASE_URL:?set ALG_BASE_URL (or legacy AOG_BASE_URL), e.g. http://localhost:11434}}"
: "${MODEL:?set MODEL, e.g. meta-llama/Llama-3.2-3B-Instruct}"

echo "== SSE Streaming probe: /v1/chat/completions (expect text/event-stream)"
curl -N -sS "$ALG_BASE_URL/v1/chat/completions" \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hi in one short sentence.\"}],\"stream\":true}" \
  | head -n 10

echo
echo "If output arrives only at the end, SSE streaming passthrough is broken."
echo "Each chunk should start with 'data: ' and arrive incrementally."
