---
applyTo: '**'
description: 'Secure coding guidance aligned to OWASP principles for backend, frontend, API, dependency, and operational practices.'
---

# Security and OWASP Guidance

## Core Expectations
- Validate and constrain untrusted input server-side.
- Use parameterized queries and avoid command interpolation.
- Do not expose internal errors or stack traces in production.
- Enforce authentication/authorization at API boundaries.

## Frontend Safety
- Avoid unsafe HTML rendering unless sanitized.
- Treat client-side validation as UX only; enforce on server.
- Keep sensitive tokens and secrets out of browser storage when possible.

## Operational Safety
- Keep dependencies current and lockfiles consistent.
- Avoid hardcoded secrets in code and config.
- Log security-relevant events without leaking sensitive data.
