---
name: webui-admin-console
description: Baut die React-WebUI (Dashboard/Backends/Models/Rules/Audit) und eine saubere API-Client-Schicht für ALG. Nutze diese Skill bei UI-Arbeiten oder Admin-API Änderungen.
---

# WebUI Admin Console (React + Vite) — ALG

## Ziele (MVP)
Seiten:
- Dashboard (Status, Counts, Uptime 24h/7d, Fehlerquote, Latency)
- Backends (CRUD + Test)
- Models (availability + running, pull action nur Ollama)
- Rules (CRUD + Dry Run)
- Audit (list)

## Architektur
- `src/api/client.ts`: fetch wrapper, base URL, auth token
- `src/api/types.ts`: DTOs (Admin API)
- `src/pages/*`: page components
- `src/components/*`: reusable components

## Auth
- MVP: Admin-Token in LocalStorage (nur internes Netz)
- send `Authorization: Bearer <token>` for `/admin/*`

## Backends CRUD — erweiterte Felder
- `backend_type`: Dropdown mit Presets:
  - **vLLM** (technisch `openai_compatible`, health_path preset `/health`)
  - **OpenAI** (technisch `openai_compatible`)
  - **OpenRouter** (technisch `openai_compatible`, extra_headers preset)
  - **Ollama** (legacy)
- `extra_headers`: Key/Value Editor (z.B. `HTTP-Referer`, `X-Title` für OpenRouter)
- `health_path`: optional, preset je nach Type
- `models_path`: default `/v1/models` für openai_compatible
- `auth_token`: optional (für OpenAI/OpenRouter)
- Test-Button: ruft HealthCheck + ListModels ab, zeigt Latenz und Model-Count

## Models-Seite
- **Pull action** nur für Ollama-Backends anzeigen
- Bei `openai_compatible`: nur „available models" anzeigen (aus `/v1/models`)
- Availability-Matrix über alle Backends

## Dashboard
- Backend Uptime 24h/7d pro Backend + Provider-Breakdown
- Top Models (Requests/Token)
- Errors (Top error codes / backends)
- Latency percentiles

## UX Hinweise
- Dry-Run soll die Entscheidung erklären: matched rule, candidates, selected backend, reason
- Backends page: "Test" zeigt version/latency
- Ollama-spezifische Features (Pull, Running) nur zeigen wenn `backend_type=ollama`

## Build
- `npm ci`
- `npm run build`
- output wird vom Go backend als static assets served

