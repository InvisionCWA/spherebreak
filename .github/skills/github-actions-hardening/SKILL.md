---
name: github-actions-hardening
description: 'Security hardening workflow for GitHub Actions files, focused on trust boundaries, token scope, and supply-chain safety.'
---

# GitHub Actions Hardening

Use this skill when reviewing or creating workflows in `.github/workflows/`.

## Threat Model Focus
- Untrusted input in `run:` scripts.
- Privileged triggers (`pull_request_target`, `workflow_run`, comments/issues).
- Over-scoped `GITHUB_TOKEN` permissions.
- Mutable action references in `uses:`.

## Review Workflow
1. Map `on:` triggers and privilege context.
2. Audit `permissions:` and scope usage.
3. Identify shell/script injection sinks.
4. Check action pinning and third-party action trust.
5. Verify secret handling and output hygiene.

## Output Format
- Severity summary first.
- Findings grouped by issue type.
- Concrete remediation snippets for high-severity issues.
