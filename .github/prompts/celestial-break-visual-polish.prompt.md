---
name: Celestial Break Visual Polish
description: "Run a full visual asset and UI polish workflow for Celestial Break with legal-safe asset handling and documentation"
argument-hint: "Which screens/assets should be prioritized and whether to generate new assets or refine existing ones"
agent: "Celestial Break Visual Asset Agent"
model: "GPT-5 (copilot)"
---
Run the full visual identity and asset polish workflow for this repository.

Inputs to use from my message:
- Which visual areas to prioritize first.
- Whether to generate new assets, improve existing assets, or both.
- Whether external free assets are allowed or original-only assets are required.
- Any style constraints or preferred color direction.
- Any performance or mobile constraints to emphasize.

Required workflow:
1. Inspect the repository and current UI/assets before changing files.
2. Audit existing assets and document source/license status in docs/assets.md.
3. Define a cohesive visual identity that preserves gameplay readability.
4. Improve visuals for key gameplay and UI screens without changing core rules.
5. Create or improve high-resolution/vector-safe assets where needed.
6. Apply accessibility-safe states (contrast, focus, non-color-only indicators, reduced motion).
7. Validate responsiveness for mobile and desktop breakpoints.
8. Optimize assets for performance and remove obvious visual inconsistencies.
9. Run relevant tests/build checks and report results honestly.

Hard constraints:
- Do not use copyrighted or unclear-license assets.
- Do not use proprietary game/franchise characters, iconography, or terminology.
- Do not use emojis in generated UI text, docs, comments, code, or asset names.
- Do not commit secrets, model weights, tool caches, or large external tool folders.
- Keep visuals original, legally safe, and documented.

Output sections:
1. Repository Inspection Summary
2. Visual Identity Summary
3. Asset Audit
4. Assets Created or Updated
5. Source and License Safety
6. UI and Screen Improvements
7. Mobile and Responsive Results
8. Accessibility Results
9. Performance Results
10. Commands Run and Outcomes
11. Files Changed
12. Remaining Recommendations