---
name: health-inventory-refresh
description: Implementiert Controller-Jobs für Healthchecks, Inventory und Running Models — driver-basiert pro Backend-Typ (openai_compatible + ollama) — inkl. Backoff und DB-Upserts. Nutze diese Skill bei Bugs in Status/Inventar oder Refresh-Zyklen.
---

# Health, Inventory & Running Models Controller (ALG)

## Jobs — driver-basiert pro Backend-Typ

### Health (alle Backends)
- Intervall default 10s
- `openai_compatible`: `GET /health` (wenn `health_path` konfiguriert), sonst Fallback `GET /v1/models`
- `ollama`: `GET /api/version`

### Inventory (ListModels)
- Intervall default 120s
- `openai_compatible`: `GET /v1/models`
- `ollama`: `GET /api/tags`

### Running Models
- Intervall default 15s
- **Nur ollama**: `GET /api/ps`
- Bei `openai_compatible`: weglassen (kein Äquivalent)

## Statuslogik
- UP: request ok
- DOWN: network error/timeout
- DEGRADED: erreichbar, aber error rate oder latency über threshold (optional MVP)
- Status-Events schreiben: jede Statusänderung → `backend_status_events` Tabelle (für Uptime-Berechnung)

## Backoff
- Exponential backoff pro backend/job
- Jitter, um thundering herd zu vermeiden

## Parsing: parameter_size
- **Nur für Ollama-Backends** relevant (aus `/api/tags` → `details.parameter_size`)
- Bei `openai_compatible`: meist nicht vorhanden, nicht versuchen zu parsen
- Input z.B. `"4.3B"`, `"13B"`, `"70B"`
- parse to float64 `parameter_size_b`
- speichern entweder in details_json + derived column (optional)
- Regeln benutzen derived value

## Dedupe
- inventory dedupe by `name` per backend
- running dedupe by `model` per backend (nur ollama)

## DB Upsert
- Nutze transaction pro backend refresh
- Entferne stale entries (z. B. running models, die nicht mehr in /api/ps auftauchen)

## Tests
- Parser Tests (parameter_size)
- Backoff Tests (deterministisch via fake clock)
- Health pro Backend-Typ testen (mock openai_compatible + mock ollama)

