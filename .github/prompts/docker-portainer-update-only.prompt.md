---
name: Portainer Update Only
description: "Update production Portainer deployment artifacts only, without local Docker test run"
argument-hint: "What changed and what should be updated in stack/env?"
agent: "Docker Portainer Deploy Agent"
model: "GPT-5 (copilot)"
---
Update Portainer production deployment artifacts only.

Do not run local Docker Desktop validation unless I explicitly ask for it.

Inputs to use from my message:
- What changed in this branch.
- Target image name and tag strategy.
- Portainer environment constraints.
- Any persistence or migration requirements.

Required outcomes:
1. Update or generate production stack YAML for Portainer.
2. Update or generate companion .env template for Portainer.
3. Preserve and validate persistence settings for score/leaderboard data.
4. Provide exact update, redeploy, and rollback steps.
5. Call out any downtime or active-session impact.

Constraints:
- Keep online behavior unchanged unless deployment files require updates.
- Keep changes minimal and production-safe.
- Do not push or publish anything unless explicitly requested.
- If data migration is required, provide a guarded procedure first.

Output sections:
1. Summary
2. Portainer Artifacts Generated
3. Persistence Mapping
4. Update Steps
5. Rollback Steps
6. Risks and Mitigations
