---
name: openai-compatible-contract-tests
description: Erstellt und pflegt Contract-Tests für OpenAI-kompatible Endpoints (/v1/*) gegen ein Referenz-Backend (vLLM oder Mock). Nutze diese Skill immer, wenn du /v1/chat/completions, /v1/responses, /v1/embeddings, /v1/models oder SSE-Streaming ändern willst.
---

# OpenAI-compatible Contract Tests (ALG vs. vLLM/Mock)

## Wann verwenden
- Bei Änderungen an **irgendeinem** `/v1/*` Endpoint.
- Bei Änderungen am Proxy-/Streaming-Code für SSE.
- Wenn ein OpenAI-kompatibler Client Fehler meldet.
- Bei neuen `openai_compatible` Backend-Typen (OpenRouter, OpenAI, etc.).

> **Hinweis:** Für Ollama-Legacy `/api/*` Endpoints siehe den Skill `ollama-contract-tests`.

## Ziel
ALG muss für OpenAI-kompatible Clients korrekt funktionieren: Statuscodes, JSON-Shape, SSE-Streaming ohne Pufferung.

## Vorgehen
1) Starte ein **Referenz-Backend** (vLLM als Docker oder OpenAI-kompatibler Mock).
2) Konfiguriere ALG mit diesem Backend (backend_type=openai_compatible).
3) Führe Tests aus:
   - Requests an `ALG_BASE_URL` senden
   - Vergleiche gegen erwartete Response-Shapes
   - Streaming: SSE darf nicht gepuffert werden

## Testfälle (mindestens)

### GET /v1/models
- Response muss `data[].id` enthalten
- Statuscode 200

### POST /v1/chat/completions (non-stream)
- Request: `{"model":"...", "messages":[{"role":"user","content":"Hi"}], "stream":false}`
- Response: `choices[].message.content` vorhanden
- `usage.prompt_tokens`, `usage.completion_tokens` vorhanden
- Statuscode 200

### POST /v1/chat/completions (stream)
- Request: `{"model":"...", "messages":[{"role":"user","content":"Hi"}], "stream":true}`
- Response: `Content-Type: text/event-stream`
- Chunks: `data: {"choices":[{"delta":{"content":"..."}}]}`
- Letzter Chunk: `data: [DONE]`
- **SSE darf nicht gepuffert werden** (Chunks müssen inkrementell ankommen)

### POST /v1/responses (non-stream)
- Request: `{"model":"...", "input":"Hi"}`
- Response: `output[]` vorhanden
- Statuscode 200

### POST /v1/responses (stream)
- Request: `{"model":"...", "input":"Hi", "stream":true}`
- Response: SSE Events mit `event:` und `data:` Feldern
- **SSE darf nicht gepuffert werden**

### POST /v1/embeddings (optional)
- Request: `{"model":"...", "input":"Hi"}`
- Response: `data[].embedding` vorhanden
- Statuscode 200

## Vergleichsregeln
- JSON: order-insensitive
- Required fields müssen vorhanden sein
- SSE: Chunks müssen inkrementell ankommen (nicht am Ende gebuffert)
- Fehler: gleiche Statusklasse (4xx/5xx) und korrekter content-type

## Helper-Skripte
- `./scripts/sse_probe.sh` — prüft SSE Streaming Passthrough
- `./scripts/openai_smoke.sh` — Smoke Tests für /v1/* Endpoints

## Wenn ein Test fehlschlägt
- Analysiere Differenz in Statuscode/JSON-Schema/SSE-Format.
- Passe ALG an, nicht den Client.
- Wiederhole `sse_probe.sh` bis Streaming korrekt ist.
