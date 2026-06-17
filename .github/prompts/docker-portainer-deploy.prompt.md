---
name: Docker Test And Portainer Prep
description: "Run local Docker Desktop test, then prepare production-ready Portainer stack and env artifacts"
argument-hint: "What changed and what environment should be targeted?"
agent: "Docker Portainer Deploy Agent"
model: "GPT-5 (copilot)"
---
Run the full Docker test and Portainer preparation workflow for this repository.

Inputs to use from my message:
- What changed in this branch.
- Whether local Docker Desktop validation is required now.
- Whether production hardening output is required now.
- Any hostnames, ports, image names, or tag strategy constraints.

Required outcomes:
1. Build and validate the latest Docker image locally on my laptop.
2. Deploy and verify app reachability on localhost.
3. Prepare or update production Portainer stack YAML.
4. Prepare or update the companion .env template for Portainer.
5. Ensure persistence is configured for score/leaderboard data.
6. Provide an explicit update and rollback procedure.

Constraints:
- Keep online behavior unchanged unless deployment files require updates.
- Keep changes minimal and production-safe.
- Do not push or publish anything unless explicitly requested.

Output sections:
1. Summary
2. Local Docker Validation
3. Portainer Artifacts Generated
4. Persistence Mapping
5. Update Steps
6. Rollback Steps
7. Open Risks
