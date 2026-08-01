---
name: docker-dev-environment
description: Standardisiert Dockerfile/Compose, lokale Dev-Workflows und Referenz-Backends (vLLM + optional Ollama) für Contract Tests. Nutze diese Skill bei Deployment/CI/Local-Run-Problemen.
---

# Docker Dev Environment (ALG)

## Ziele
- `docker build -t alg:dev .` muss funktionieren
- `docker compose up -d` startet ALG + Referenz-Backends
- DB als Volume (sqlite)
- Healthchecks für ALG Container

## Compose (MVP)
Services:
- **alg**: expose 11434 (Gateway)
- **vllm**: OpenAI-kompatibles Referenz-Backend (Standard-Testbackend)
- **ollama**: optional als Legacy-Testbackend (für `/api/*` Contract Tests)

Siehe Template: `templates/docker-compose.dev.yml`

## Env
Neue Variablen nutzen `ALG_*` Prefix, alte `AOG_*` werden als Alias weiterhin akzeptiert:
- `ALG_ADMIN_TOKEN` (required) — Fallback: `AOG_ADMIN_TOKEN`
- `ALG_DB_URL` (sqlite path) — Fallback: `AOG_DB_URL`
- `ALG_LISTEN_ADDR` — Fallback: `AOG_LISTEN_ADDR`
- `ALG_HEALTH_INTERVAL`, `ALG_INVENTORY_REFRESH`, `ALG_RUNNING_REFRESH`

## CI/Local Smoke Tests
- `curl /health` (ALG Liveness)
- `curl /v1/models` (über ALG gegen openai_compatible Backends)
- Legacy optional: `curl /api/version` (Ollama-Path)
- Contract: Scripts aus `ollama-contract-tests` (Legacy) + `openai-compatible-contract-tests` (neu)

## Debugging
- set log level env
- expose pprof optional (Go) nur im dev

