---
name: go-streaming-proxy
description: Implementiert robustes Streaming-Passthrough (Ollama NDJSON + OpenAI-compatible SSE) und Reverse-Proxying in Go. Nutze diese Skill, wenn du Proxy-/HTTP-Handling oder Timeouts änderst.
---

# Go Streaming Reverse Proxy (Ollama + OpenAI-compatible)

## Wann verwenden
- Änderungen an Ollama-Endpoints: `/api/chat`, `/api/generate`, `/api/pull`, `/api/create`
- Änderungen an OpenAI-compatible Endpoints: `/v1/chat/completions`, `/v1/responses`, `/v1/embeddings`
- Änderungen an Timeouts/Transport/HTTP client
- Bugs: „OpenWebUI hängt“, „TTFT extrem“, „Stream kommt erst am Ende“

## Grundregeln
- **Nicht** den kompletten Upstream-Body einlesen, wenn `stream:true`.
- Verwende `http.Transport` mit sauberen Timeouts:
  - kurzer Connect/Handshake Timeout
  - ReadTimeout für Streaming oft **aus** oder sehr hoch
- Flush: nutze `http.Flusher` und schreibe Chunk-by-Chunk.

## Streaming-Formate

### Ollama NDJSON (Legacy)
- Line-delimited JSON (`\n`-separated)
- Endpoints: `/api/chat`, `/api/generate`, `/api/pull`, `/api/create`
- Passthrough: `io.Copy` mit `flushWriter`

### OpenAI-compatible SSE
- Server-Sent Events Format (`data: {...}\n\n`, final `data: [DONE]\n\n`)
- Endpoints: `/v1/chat/completions`, `/v1/responses`
- **SSE passthrough**: nicht puffern, `http.Flusher` nutzen, chunkweise schreiben
- `Accept-Encoding: identity` für Streaming setzen (keine Gzip-Pufferung!)
- ReverseProxy nur wenn `FlushInterval` klein gesetzt ist, sonst lieber eigener Copy-Loop

## Empfohlenes Muster (Handler)
1) Build Upstream Request:
   - gleiche Method, path, query
   - kopiere relevante header (Content-Type, Authorization, etc.)
   - extra headers aus Backend-Config (z.B. OpenRouter X-Title)
   - body ist stream: `req.Body` direkt weiterreichen
2) Do Upstream Request (mit Context cancellation!)
3) Setze Downstream statuscode + header (Content-Type etc.)
4) Wenn Response „streaming“:
   - `io.Copy` in einen `flushWriter` (flush nach jedem write)
   - disable proxy buffering (bei Reverse Proxy ggf. `X-Accel-Buffering: no`)
5) Sonst:
   - `io.Copy` ohne flush (oder optional)

## Test
- Ollama-Streaming: `ollama-contract-tests/scripts/stream_probe.sh`
- OpenAI-SSE: `openai-compatible-contract-tests/scripts/sse_probe.sh`

## Pitfalls
- Proxy in Go kann standardmäßig puffern, wenn du `httputil.ReverseProxy` nutzt. Prüfe `FlushInterval`.
- Gzip kann die Chunking-Granularität zerstören. Für Streaming: `Accept-Encoding: identity`.
- SSE erwartet `Content-Type: text/event-stream` — nicht überschreiben!
- Nginx/Traefik davor: Buffering ausschalten (out of scope, aber dokumentieren).

## Ressourcen
- Verwende `httputil.ReverseProxy` nur, wenn du `FlushInterval` und Header sauber setzt.
- Alternativ: eigenes Proxying pro Request ist für Streaming oft einfacher zu kontrollieren.

