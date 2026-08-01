---
name: ollama-contract-tests
description: Erstellt und pflegt Ollama Legacy Contract-/Golden-Tests, die die ALG-Antworten gegen eine echte Ollama-Instanz vergleichen. Nutze diese Skill immer, wenn du API-Kompatibilität, Statuscodes, JSON-Schema oder Streaming für /api/* Endpoints ändern willst.
---

# Ollama Legacy Contract Tests (ALG vs. Ollama)

## Wann verwenden
- Bei Änderungen an **irgendeinem** `/api/*` Endpoint (Ollama Legacy Path).
- Bei Änderungen am Proxy-/Streaming-Code für NDJSON.
- Wenn OpenWebUI oder ein Ollama-Client „komische" Fehler meldet.

> **Hinweis:** Für OpenAI-kompatible Endpoints (`/v1/*`) siehe den Skill `openai-compatible-contract-tests`.

## Ziel
ALG muss sich für Ollama-Clients „wie Ollama" anfühlen: Statuscodes, JSON-Felder, Fehlertexte, Streaming-Chunking.

## Vorgehen (MVP)
1) Starte eine **referenz-Ollama** (Docker oder lokal).
2) Konfiguriere ALG so, dass dieses Ollama als Backend registriert ist (backend_type=ollama).
3) Führe Tests aus:
   - gleiche Requests an `OLLAMA_BASE_URL` und `ALG_BASE_URL`
   - vergleiche:
     - HTTP Statuscode
     - required JSON fields (tolerant bei Reihenfolge)
     - header basics (`Content-Type`)
     - Streaming: „line-delimited JSON“ darf nicht gebuffert werden

## Testfälle (mindestens)
- GET `/api/version`
- GET `/api/tags`  (Response muss `models[].name` enthalten)
- GET `/api/ps`    (Response muss `models[].model` enthalten)
- POST `/api/chat` (stream=false & stream=true)
- POST `/api/generate` (stream=false & stream=true)
- POST `/api/embed` (+ Alias `/api/embeddings` falls vorhanden)
- POST `/api/show`
- POST `/api/pull` (mindestens schema/streaming, optional)

## Vergleichsregeln (tolerant, aber streng genug)
- JSON: order-insensitive. Erlaubt: zusätzliche Felder in ALG **nur** wenn Feature-Flag aktiv.
- required fields müssen vorhanden sein.
- Fehler: gleiche Statusklasse (4xx/5xx) und gleicher content-type.

## Helper-Skripte
Nutze die Skripte in diesem Skill-Ordner:
- `./scripts/contract_smoke.sh` (smoke)
- `./scripts/stream_probe.sh` (streaming probe)

## Wenn ein Test fehlschlägt
- Analysiere Differenz in Statuscode/JSON-Schema.
- Passe ALG an, nicht den Client.
- Wiederhole `stream_probe.sh` bis Chunking korrekt ist.

