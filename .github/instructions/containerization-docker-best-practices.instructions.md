---
applyTo: '**/Dockerfile,**/Dockerfile.*,**/*.dockerfile,**/docker-compose*.yml,**/docker-compose*.yaml,**/compose*.yml,**/compose*.yaml'
description: 'Docker and containerization guidance for secure, efficient images, reproducible builds, and safe runtime defaults.'
---

# Containerization Docker Best Practices

## Rules
- Prefer multi-stage builds for production images.
- Keep runtime images minimal and avoid dev-only dependencies.
- Use non-root users when feasible.
- Avoid embedding secrets in images.
- Keep `.dockerignore` current.

## Compose Guidance
- Explicitly declare environment variables and ports.
- Use persistent volumes for stateful data.
- Prefer predictable restart policy.
- Avoid exposing unnecessary ports/services.

## Validation
- Confirm build reproducibility and startup health.
- Call out tradeoffs when security and convenience conflict.
