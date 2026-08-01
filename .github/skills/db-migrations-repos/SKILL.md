---
name: db-migrations-repos
description: Erstellt DB-Migrations (SQLite zuerst) und Repositories mit sauberen Upserts/Queries für backends, inventory, running, rules, sticky, audit, status_events. Nutze diese Skill bei Schemaänderungen oder Query-Bugs.
---

# DB Migrations & Repositories (SQLite-first) — ALG

## Prinzipien
- Jede Schemaänderung = neue Migration in `/migrations`
- Repositories kapseln SQL (kein SQL im HTTP Handler)
- Verwende Prepared Statements / Query Builder (optional)
- Atomic updates via transactions

## Must-have Queries
- Backends: list enabled, by id, update status
- Inventory: upsert models for backend, list availability for model
- Running: upsert running for backend, list loaded models (nur ollama)
- Rules: list enabled sorted by priority desc
- Sticky: get/set key with TTL
- Audit: append events + list
- **Status Events**: append status event + query by backend_id + time window (für Uptime-Berechnung)

## Backend-Erweiterungen (ALG)
Neue Felder in `backends` Tabelle:
- `backend_type` (TEXT, default `ollama`) — Werte: `ollama`, `openai_compatible`
- `extra_headers_json` (TEXT, default `{}`) — z.B. OpenRouter Identifikations-Header
- `health_path` (TEXT, nullable) — wenn leer, backend_type default
- `models_path` (TEXT, default `/v1/models` für openai_compatible)
- `request_timeout_ms` (INT, nullable) — override pro Backend

## Neue Tabelle: backend_status_events
- `id` (uuid oder autoincrement)
- `backend_id` (FK)
- `ts` (timestamp)
- `status` (TEXT: `UP|DOWN|DEGRADED`)
- `latency_ms` (INT)
- `error` (TEXT, nullable)

## Indexes (MVP)
- backends(enabled, status)
- inventory(backend_id, name)
- running(backend_id, model)
- sticky(key)
- rules(enabled, priority)
- **backend_status_events(backend_id, ts)**
- optional: usage_requests(backend_id, ts)

## Migration Style
- SQL files numbered `0001_init.sql`, `0002_...sql`
- Include down-migration only wenn Tooling es unterstützt; sonst forward-only.

## Tests
- Repository tests against temp sqlite file

