#!/usr/bin/env bash
set -euo pipefail

: "${ALG_BASE_URL:=${AOG_BASE_URL:?set ALG_BASE_URL (or legacy AOG_BASE_URL), e.g. http://localhost:11434}}"
: "${MODEL:?set MODEL, e.g. llama3.2:3b}"

echo "== Streaming probe: /api/chat (expect line-delimited JSON)"
curl -N -sS "$ALG_BASE_URL/api/chat" \
  -H 'Content-Type: application/json' \
  -d "{"model":"$MODEL","messages":[{"role":"user","content":"Say hi in one short sentence."}],"stream":true}" \
  | head -n 5

echo
echo "If output arrives only at the end, streaming passthrough is broken."
