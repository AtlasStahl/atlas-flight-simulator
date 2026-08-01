---
name: observability-metrics-logs
description: Definiert Metriken (alg_*), Logging-Format, Labels und Minimal-Dashboards/Queries für den ALG-Betrieb. Nutze diese Skill bei Änderungen an Metriken/Logs oder bei Performance-/Stabilitätsproblemen.
---

# Observability (Prometheus + JSON Logs) — ALG

## Metrics (MVP)
- Counter: `alg_requests_total{backend_id,backend_name,backend_type,provider,endpoint,model,code}`
- Histogram: `alg_request_latency_ms_bucket{backend_id,backend_name,backend_type,provider,endpoint,model}`
- Gauge: `alg_backend_up{backend_id,backend_name,backend_type,provider}`
- Counter: `alg_failovers_total{model,from,to,backend_type}`
- Counter: `alg_sticky_hits_total{model}`
- Gauge: `alg_inflight_requests{backend_id,backend_name}`

## Label Hygiene
- `model` kann high-cardinality sein. MVP ok intern, aber optional:
  - allowlist / hashing
  - or expose both: `model_family` + `model_exact` behind flag
- `backend_type`: `ollama` | `openai_compatible`
- `provider`: freier Tag, z.B. `vllm`, `openai`, `openrouter`, `ollama`

## Logs (JSON)
- fields: `ts`, `level`, `request_id`, `endpoint`, `model`, `backend`, `backend_type`, `provider`, `duration_ms`, `status`, `failover`, `error`
- optional: `client_id` (wenn v2 Client-Keys aktiv)
- request_id: accept `X-Request-Id` oder generiere UUID

## Uptime Monitoring
- `alg_backend_up` (Gauge) = 0/1 pro Backend
- DB-Events (`backend_status_events`) ermöglichen Uptime-% Berechnung im UI
- Failover Counter Label zusätzlich `backend_type`

## TTFT
- TTFT ist schwer ohne tiefe stream parsing.
- MVP: approximieren via first-byte time (time until first write).
  - log `ttfb_ms` zusätzlich.

## Quick Grafana Queries (Beispiele)
- Error rate: sum(rate(alg_requests_total{code=~"5.."}[5m])) / sum(rate(alg_requests_total[5m]))
- P95 latency: histogram_quantile(0.95, sum(rate(alg_request_latency_ms_bucket[5m])) by (le, backend_id))
- Backend uptime: avg_over_time(alg_backend_up{backend_id="..."}[24h])

