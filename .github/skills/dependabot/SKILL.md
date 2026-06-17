---
name: dependabot
description: 'Guidance for creating and maintaining .github/dependabot.yml across npm, docker, and github-actions ecosystems.'
---

# Dependabot

Use this skill when configuring dependency update automation.

## Goals
- Cover all relevant ecosystems in this repo.
- Reduce PR noise using grouping and schedules.
- Keep update automation secure and predictable.

## Repository Ecosystems
- npm (`client/`, `server/`, and potentially `e2e/`)
- docker (Dockerfile)
- github-actions (`.github/workflows/*.yml`)

## Baseline Guidance
1. Define update entries per ecosystem and directory.
2. Add grouping for minor/patch noise reduction.
3. Set practical schedule cadence.
4. Keep security updates enabled and reviewed promptly.
5. Revisit config when repo layout changes.
