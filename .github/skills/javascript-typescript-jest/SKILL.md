---
name: javascript-typescript-jest
description: 'Best practices for writing robust JavaScript/TypeScript Jest tests, including structure, mocking, and async behavior.'
---

# JavaScript/TypeScript Jest

Use this skill when adding or improving Jest tests in this repository.

## Goals
- Write readable tests with clear behavior-focused names.
- Keep mocks minimal and reset state between tests.
- Prefer deterministic async test patterns.

## Checklist
1. Use `describe` blocks for behavior grouping.
2. Keep assertions focused and specific.
3. Mock external systems only (network, filesystem, DB).
4. Use `async/await` with `resolves`/`rejects` for promise flows.
5. Avoid snapshot overuse unless structure is stable and intentional.

## Repository Notes
- Server tests live primarily in `server/__tests__/` and `server/*.test.js`.
- Keep test runtime practical and avoid flakiness.
