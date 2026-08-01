---
name: documentation
description: Documentation standards for Atlas LLM Gateway (ALG). Use this skill for README updates, API/architecture docs, and mandatory UI documentation sync (WebUI Help page + README) whenever UI behavior, labels, flows, or admin screens change.
---

# Documentation Guidelines (ALG)

Standards for creating consistent, maintainable documentation across Atlas LLM Gateway.

---

## Quick Start

| I want to... | Do this |
|--------------|----------|
| Document API behavior change | Update README endpoint section + request/response examples |
| Change Admin API contracts | Update README admin endpoint table and auth notes |
| Change WebUI page/flow/labels | Update `webui/src/pages/HelpPage.tsx` + README WebUI/Admin section in same PR |
| Add/remove major capability | Update README “Key Features” and relevant Quickstart/Admin snippets |
| Document internal architecture | Use ADR/module docs from this skill’s templates/references |

---

## Language Policy

| Documentation Type | Language |
|-------------------|----------|
| README and developer docs | English |
| In-app UI help (`HelpPage`) | German (matching current UI copy) |
| Release notes / AGENTS prose | German (repo convention) |
| Code comments and identifiers | English |

---

## Documentation Structure

```
docs/
  architecture/              # ADRs, modules, diagrams (as available)
  development/               # Developer guides (as available)
webui/
  src/pages/HelpPage.tsx     # In-app user help (must match current UI)
README.md                    # Source of truth for setup, admin, API, and UI overview
```

---

## When to Use Which Reference

| Task | Reference |
|------|-----------|
| OpenAPI, endpoint docs, problem details | [api-documentation.md](references/api-documentation.md) |
| ADRs, C4 diagrams, module docs | [architecture-docs.md](references/architecture-docs.md) |
| XML comments, record docs | [code-documentation.md](references/code-documentation.md) |
| In-app help, localization, UX copy | [user-manual.md](references/user-manual.md) |

---

## Keeping Documentation Current

| Code Change | Required Documentation |
|-------------|----------------------|
| New/changed endpoint | README endpoint docs + examples |
| New/changed admin route | README admin endpoint table |
| New/changed UI page | `webui/src/pages/HelpPage.tsx` section update |
| UI text/state/interaction change | README WebUI/Admin section update |
| Architecture decision | ADR (if long-lived impact) |
| Public API surface in code | Code comments and type-level docs |

---

## Mandatory UI Documentation Sync

When a PR changes WebUI behavior, the same PR must include documentation updates.

### Must update

- `webui/src/pages/HelpPage.tsx` for user-facing behavior, labels, states, and flows
- `README.md` for setup/admin guidance and any changed workflows

### Trigger examples

- New page, tab, form field, validation rule, empty state, or primary action
- Changed button labels, endpoint wiring, auth flow, table columns, filters, or charts
- New admin capability (users, API keys, LDAP, rules, analytics, settings)

### Definition of done for UI changes

- Help text reflects actual UI behavior (no stale labels)
- README matches current UI navigation and feature set
- API and UI descriptions are consistent (no contradiction)

---

## PR Checklist

- [ ] README updated for user-visible/API/admin changes
- [ ] `webui/src/pages/HelpPage.tsx` updated for UI changes
- [ ] API examples still valid after endpoint/request changes
- [ ] Architecture docs/ADR updated if behavior is long-lived and cross-cutting
