---
name: webapp-testing
description: 'Toolkit for testing local web application flows quickly, with browser checks, screenshots, and actionable debugging output.'
---

# Web App Testing

Use this skill for rapid browser-level validation while developing.

## Goals
- Validate critical user flows with minimal test friction.
- Capture useful debugging artifacts when checks fail.
- Keep tests stable across environments.

## Steps
1. Confirm the target app is reachable (localhost URL).
2. Test key navigation and interaction paths.
3. Verify user-visible outcomes (text, route, state updates).
4. Capture screenshots/log context for failures.
5. Summarize pass/fail and likely root causes.

## Best Practices
- Prefer role/data-testid selectors over style/class selectors.
- Use explicit waits for async UI transitions.
- Keep each test independent.
