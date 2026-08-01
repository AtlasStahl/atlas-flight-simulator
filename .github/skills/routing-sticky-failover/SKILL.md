---
name: routing-sticky-failover
description: Implementiert Rule-Engine, Sticky-Routing (TTFT) und Failover/Circuit Breaker Logik für ALG (multi-backend). Nutze diese Skill bei Änderungen an Routing, Regeln, Backend-Auswahl oder Fehlerbehandlung.
---

# Routing, Sticky Routing & Failover (ALG)

## Wann verwenden
- neue Routing-Regeln / Tier-Grenzen
- Sticky- oder Failover-Bugs
- Auslastungs-/Loadbalancing-Optimierung
- Backend-Typ-spezifisches Routing (ollama vs openai_compatible)

## Ziel
- Minimale TTFT durch stabile Zuordnung `CLIENT+MODEL → BACKEND`
- Failover nur, wenn notwendig (DOWN/Timeout/5xx)
- Keine Request-Storms auf kaputte Backends
- Fallback-Chains: z.B. vLLM → OpenRouter → OpenAI

## Entscheidungsreihenfolge (MVP)
1) Extract `model` aus Request Body (chat/generate/embed/completions/responses).
2) Check Sticky Assignment:
   - Key: `STICKY:<client_id|ip>:<endpoint>:<model>`
   - Wenn Backend `UP` und circuit breaker not OPEN => verwenden.
3) Rule Evaluation (priority desc):
   - Match by `model`, `parameter_size_b`, `endpoint`
   - **Neu**: Match by `backend_type` (ollama vs openai_compatible)
   - Optional: Match by `capability` (responses/chat_completions/embeddings/images)
   - Action yields `primary` + `fallback` + constraints + lb
4) Candidate Set bauen:
   - enabled backends + status UP (DEGRADED nur wenn nötig)
   - constraints: `must_have_model` => inventory check (**nur anwenden wenn Inventory für Backend-Typ sinnvoll/verfügbar**)
   - constraints: `prefer_loaded` => prefer running models (**nur für Ollama**, `/api/ps`)
5) Wähle Backend:
   - wenn `primary` tier: filter by tier
   - sonst id direkt
   - lb: `LEAST_INFLIGHT` bevorzugt
6) Proxy Request.
7) Bei Fehler:
   - classify: network/timeout/5xx => failover allowed
   - update circuit breaker
   - retry mit nächstem fallback candidate (z.B. vLLM → OpenRouter → OpenAI)
   - schreibe Sticky auf erfolgreichen Backend

## Fallback-Chain (Beispiel)
```
primary: vLLM (lokal, schnell)
  → fallback[0]: OpenRouter (cloud, günstig)
    → fallback[1]: OpenAI (cloud, teuer, reliable)
```

## Klassifikation Failover
- allowed: connect timeout, read timeout (wenn stream=false), ECONNREFUSED, 502/503/504
- nicht allowed (default): 4xx vom upstream (Modell nicht vorhanden etc.) → kein wildes Retry

## Unit Tests
- Sticky hit returns same backend
- Backend DOWN triggers fallback
- must_have_model excludes backends without inventory model
- prefer_loaded picks backend with running model (Ollama only)
- circuit breaker OPEN excludes backend
- backend_type filter works correctly
- Fallback chain traversal (vLLM → OpenRouter → OpenAI)

## Tipp
- Behalte Router deterministisch (gleiche Inputs => gleiche Entscheidung), außer LB.

