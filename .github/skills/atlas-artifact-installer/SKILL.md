---
name: atlas-artifact-installer
description: Install or update Atlas local agent artifacts from the read-only Artifact MCP catalog into the current workspace or user profile. Use when the user asks to find, install, sync, or update skills, instructions, prompts, agents, or plugins. Server-side Hub/MCP state must remain read-only.
---

# Atlas Artifact Installer

Use this skill when installing or updating Atlas agent customization artifacts locally. The Artifact Hub/MCP server is a read-only catalog. Do not modify server files, routes, containers, Hub state, or MCP route state as part of local installation.

## Source

Use the configured read-only Artifact MCP endpoint, normally `/mcp/artifacts`, to discover and inspect artifacts:

1. `list_artifacts` to find candidates.
2. `get_artifact` to read manifest metadata.
3. `preview_artifact` to inspect bounded file previews before local writes.

If the MCP endpoint is unavailable, stop and tell the user what is missing. Do not invent artifact contents.

## Local Targets

Install only into allow-listed local customization paths:

| Artifact kind | Workspace target |
| --- | --- |
| `skill` | `.github/skills/<id>/` |
| `instruction` | `.github/instructions/<id>.instructions.md` |
| `prompt` | `.github/prompts/<id>.prompt.md` |
| `agent` | `.github/agents/<id>.agent.md` |
| `plugin` | do not auto-install; require explicit user approval and a review of executable behavior |

For this bootstrap package, copy `assets/atlas-artifacts.instructions.md` to `.github/instructions/atlas-artifacts.instructions.md` and keep this `SKILL.md` at `.github/skills/atlas-artifact-installer/SKILL.md`.

## Lockfile

Maintain `.github/artifacts.lock.json` as local installation state. Create it if missing with this shape:

```json
{
  "version": 1,
  "installed": []
}
```

Each installed artifact entry should include `id`, `type`, `version`, `channel`, `sha256`, `source`, `target_root` or `target`, `files`, `installed_at`, and `managed_by`. Use `atlas-artifact-installer` for `managed_by`.

## Install Workflow

1. Confirm the target scope: workspace by default; user profile only when explicitly requested.
2. Read artifact metadata and preview from the read-only catalog.
3. Reject path traversal, absolute paths, symlinks, and writes outside the allow-listed local targets.
4. Back up existing local target files before replacing them.
5. Write files locally using the artifact package layout.
6. Validate YAML frontmatter for installed `.md` customization files.
7. Update `.github/artifacts.lock.json` after local files are written.
8. Report installed files, skipped files, and any validation warnings.

## Update Workflow

1. Read `.github/artifacts.lock.json`.
2. Compare local entries with the read-only catalog by artifact ID, version, channel, and SHA-256.
3. Preview diffs before replacing local files when changes are material or user-authored local edits exist.
4. Back up replaced files.
5. Update local files and lockfile together.
6. Validate installed files after replacement.

## Safety Rules

- Never write to the Hub/MCP server while using this skill.
- Never treat `preview_artifact` output as complete if the artifact is larger than the preview limit; fetch or inspect the full local payload only through approved local access.
- Do not install plugins automatically.
- Do not overwrite user-authored files unless the lockfile shows they are managed by this installer or the user explicitly approves replacement.
- Keep changes focused on artifact installation and lockfile maintenance.
