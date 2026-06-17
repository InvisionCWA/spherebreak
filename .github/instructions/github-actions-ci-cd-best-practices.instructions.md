---
applyTo: '.github/workflows/*.yml,.github/workflows/*.yaml'
description: 'Best practices for robust, secure, and maintainable GitHub Actions CI/CD workflows.'
---

# GitHub Actions CI/CD Best Practices

## Workflow Design
- Keep workflows modular and clearly named.
- Use explicit triggers and branch/path filters.
- Use matrix and caching only where valuable.

## Security
- Set least-privilege `permissions` at workflow/job level.
- Avoid mutable third-party action refs.
- Keep secret usage minimal and never echo secrets.
- Prefer OIDC where cloud auth is required.

## Reliability
- Use artifact passing between jobs when needed.
- Add sensible timeouts/concurrency controls.
- Keep failure output actionable.
