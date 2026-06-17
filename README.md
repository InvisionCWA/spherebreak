# Celestial Break

Celestial Break is a real-time multiplayer number puzzle game. Players select tokens so the sum is a positive multiple of the current target number. The backend is server-authoritative for match logic, anti-cheat validation, timing, and leaderboard persistence.

This repository contains only original game content and original assets.

## Features

- The board has a central target number from 1 to 9.
- Each move must include at least one inner token.
- Selected token values must sum to a positive multiple of the target number.
- Valid Break moves grant score, combo, streak, and quota progress.
- The server authoritatively validates all moves, timing, scoring, and outcomes.

## Core Rules

- Target number range: 1 to 9.
- Token values: 1 to 9.
- Inner tokens: required zone; at least one must be selected.
- Outer tokens: optional selection.
- Invalid move: rejected by server; does not advance trusted scoring.
- Match win condition:
  - first to quota, or
  - highest score when turn limit ends.

## Match Settings

Supported settings:

- `turnLimit`
- `secondsPerTurn`
- `quotaToWin`
- `targetNumberRange`
- `boardSize`
- `maxPlayers`
- `ranked`
- `tokenReplacementMode`
- `comboRules`

## Multiplayer Lifecycle

Match states:

- `waiting`
- `starting`
- `active`
- `completed`
- `abandoned`

Features:

- Create match
- Join match by code
- Quick queue placeholder
- Ready state and countdown
- Real-time board sync via Socket.IO
- Server turn timer authority
- Reconnect support by persisted player id
- Rematch request
- Bot practice mode (easy, normal, hard)
- Automatic CPU fallback for waiting multiplayer matches after 60 seconds

## Anti-Cheat Model

The server is authoritative for:

- RNG and board generation
- target number updates
- move validation
- score and combo calculations
- turn timing
- winner determination
- ranked leaderboard writes

Implemented protections:

- per-player move rate limiting
- duplicate nonce rejection
- stale board version rejection
- inactive-player rejection
- turn-window validation
- unknown token id rejection
- suspicious activity flags for:
  - request flooding
  - duplicate nonce spam
  - disconnect abuse
  - stale board misuse
- replay event log per match for audit

## Leaderboards

Tracked stats include:

- rating
- wins
- losses
- win rate
- best score
- best combo
- best streak
- fastest valid Break
- weekly ranked scores
- all-time ranked scores

### Celestial rank badges

Spherebreak exposes a server-authored rank badge anywhere player identities appear. The badge is decorative, but the underlying rank DTO is trusted server output and includes the current tier, short code, icon, colors, and progression toward the next tier when applicable.

Current ladder:

- Comet
- Lumen
- Nova
- Astral

High-level formula:

- trusted `LeaderboardStat.rating` is the primary rank input
- if a player has malformed or missing rating data, the server falls back to a deterministic estimate using persisted wins and losses (`1000 + wins*20 - losses*10`)
- fallback promotion is capped below Nova until a player has at least 3 recorded ranked matches, which keeps early data from over-promoting accounts
- top-rank players do not receive next-rank progress fields

Rules:

- only server-completed ranked matches update ranked leaderboard stats
- casual matches do not affect ranked leaderboard standings
- clients cannot write rank or trusted stat fields; socket and HTTP responses always recompute rank server-side
- server-generated CPU opponents use persisted ranked stats when available; otherwise they render with the neutral fallback rank
- rank badges always include text labels and compact non-color cues for accessibility, and long names truncate safely on mobile widths

## Tech Stack

- Frontend: React 18 (Create React App)
- Backend: Node.js, Express, Socket.IO
- Data: Prisma ORM with SQLite (default)
- Tests: Jest (server and client)
- Containers: Docker and Docker Compose

## Repository Layout

```text
.
|-- client/
|   |-- src/
|   |-- public/
|   `-- package.json
|-- server/
|   |-- src/
|   |-- prisma/
|   |-- __tests__/
|   |-- index.js
|   `-- package.json
|-- marketing/
|-- e2e/
|-- docker-compose.yml
|-- Dockerfile
`-- README.md
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker, if you want to use the container workflow

## Quick Start

Install dependencies:

```bash
npm install --prefix server
npm install --prefix client
```

Create `server/.env`:

```env
DATABASE_URL="file:./prisma/dev.db"
PORT=3000
NODE_ENV=development
```

Initialize the database:

```bash
npm run db:generate --prefix server
npm run db:push --prefix server
npm run db:seed --prefix server
```

Start the backend:

```bash
npm run dev --prefix server
```

Start the frontend in another terminal:

```bash
npm start --prefix client
```

If you want the client dev server to talk to the backend on a different port, set `REACT_APP_SERVER_URL=http://localhost:3000` before starting the client.

## Gameplay Rules

- Token values range from 1 to 9
- The target number range is configurable, with 1 to 9 as the default range
- A valid move must include at least one inner token
- Selected token values must sum to a positive multiple of the target
- Match ends when quota is reached or the turn limit is hit

## Match Lifecycle

States:

- `waiting`
- `starting`
- `active`
- `completed`
- `abandoned`

Behavior:

- Reconnect support by persisted player id
- Ready-check and countdown before match start
- Automatic bot injection after 60 seconds when matchmaking stalls

## Leaderboard and Persistence

Persisted data includes:

- Users and display names
- Leaderboard stats, including rating, wins, losses, win rate, best scores, best combo, best streak, and fastest Break
- Match records and participants
- Replay event logs

Only server-completed ranked matches update ranked leaderboard values.

Live in-progress match state is in memory and is not durable across server restarts.

### Where scores are stored

- Local development: SQLite file from `DATABASE_URL`, usually `server/prisma/dev.db`
- Container deployment: whatever path `DATABASE_URL` points to; use a mounted volume for persistence

## Docker

Run with the current compose file:

```bash
docker compose up --build
```

The included compose file is minimal and exposes port 3000.

Recommended persistent setup for Portainer or other production-like deployments:

```yaml
services:
  spherebreak:
    image: your-registry/spherebreak:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=file:/data/dev.db
    volumes:
      - spherebreak-data:/data
    restart: unless-stopped

volumes:
  spherebreak-data:
```

This keeps leaderboard and match history data across image rebuilds and stack updates.

## Portainer Deployment

### First-time deployment

- Build the image on the Docker host that Portainer will use:

```bash
docker compose build
```

- In Portainer, go to **Stacks** → **Add stack**, paste the compose file, and deploy it.

- If you deploy from a registry, tag and push the image first, then point the stack `image:` field at that tag.

### Updating the app

- Rebuild the image after pulling new code.
- Tag and push a new image version if you deploy from a registry.
- Open the stack in Portainer and choose **Update the stack**.

The named volume is left untouched during updates, so persisted leaderboard data remains available.

### Backing up the database

```bash
docker run --rm -v spherebreak-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/spherebreak_backup_$(date +%Y%m%d).tar.gz /data
```

Restore:

```bash
docker run --rm -v spherebreak-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/spherebreak_backup_YYYYMMDD.tar.gz -C /
```

## Testing

Run the main checks:

```mermaid
flowchart TD
    A[Match ends] --> B{server completed and ranked?}
    B -- no --> C[Skip ranked leaderboard update]
    B -- yes --> D[Compute winner and participant stats]
    D --> E[Upsert leaderboard stats]
    E --> F[Persist match record]
    F --> G[Persist replay events]
    G --> H[Recompute public rank DTO from trusted persisted stats]
```

Rank DTOs are attached to leaderboard rows, profile responses, open lobby payloads, and live/public player state. Clients render them but never author them.

## CPU Fallback Lifecycle
```bash
npm test --prefix server
npm test --prefix client -- --watch=false
npm run build --prefix client
```

Main server test coverage includes rules engine, match engine, anti-cheat, bots, lobby flow, and leaderboard updates.

## Architecture

```mermaid
flowchart LR
  Client[React Client] --> Socket[Socket.IO Gateway]
  Socket --> Lobby[Lobby Service]
  Lobby --> Engine[Match and Rules Engine]
  Engine --> Replay[Replay Logging]
  Engine --> DB[(Prisma + SQLite)]
  Client --> API[HTTP API]
  API --> DB
```

## Copilot Customizations

This repository includes custom GitHub Copilot agents and prompt wrappers under `.github/` to speed up common workflows safely.

### Folder layout

- `.github/agents/`: reusable specialized agents
- `.github/prompts/`: user-invocable prompt wrappers that call agents with structured inputs
- `.github/instructions/`: project-wide coding and safety guidance
- `.github/skills/`: reusable domain workflow guidance

### Custom agents

The following agent files are available in `.github/agents/`:

1. `agent-governance-reviewer.agent.md`
Purpose: reviews agent customizations for safety, policy clarity, and maintainable governance controls.
When to use: when editing or auditing `.github/agents`, `.github/prompts`, `.github/skills`, or `.github/instructions`.

2. `awesome-copilot-selector.agent.md`
Purpose: analyzes this repository and curates relevant assets from `github/awesome-copilot`.
When to use: when you want recommendations (or installation plans) for additional agents, skills, and instructions.

3. `docker-portainer-deploy.agent.md`
Purpose: validates local Docker runs and prepares production-ready Portainer deployment artifacts.
When to use: Docker Desktop testing, Portainer stack updates, persistence hardening, and rollout/rollback planning.

4. `github-actions-expert.agent.md`
Purpose: improves GitHub Actions with least-privilege permissions, reliable execution, and safer action usage.
When to use: CI/CD workflow authoring, hardening, troubleshooting, and optimization in `.github/workflows/`.

5. `playwright-tester.agent.md`
Purpose: browser-flow validation and Playwright test generation/triage.
When to use: UI regression checks, scenario-based e2e tests, and investigation of frontend behavior.

6. `celestial-break-visual-asset.agent.md`
Purpose: visual identity and asset polish agent for Celestial Break.
When to use: improving game visuals, tokens, board styling, badges, leaderboard presentation, and asset documentation/licensing.

### Prompt wrappers

The following prompt files are available in `.github/prompts/`:

1. `docker-portainer-deploy.prompt.md`
Agent used: `Docker Portainer Deploy Agent`.
Use for: full Docker validation plus Portainer artifact generation and deployment procedure output.

2. `docker-portainer-update-only.prompt.md`
Agent used: `Docker Portainer Deploy Agent`.
Use for: Portainer stack and env updates only, without local Docker validation by default.

3. `celestial-break-visual-polish.prompt.md`
Agent used: `Celestial Break Visual Asset Agent`.
Use for: end-to-end visual audit/polish workflow with accessibility, licensing, and performance constraints.

### How to invoke

- Open Copilot Chat and invoke the agent directly by name.
- Or use a prompt wrapper from `.github/prompts/` and provide the requested input details.

### Feature-to-agent mapping

- Multiplayer/gameplay visuals and presentation: `Celestial Break Visual Asset Agent`
- Browser-level gameplay and UI testing: `Playwright Tester Mode`
- CI pipeline quality and security: `GitHub Actions Expert`
- Docker and Portainer deployment workflows: `Docker Portainer Deploy Agent`
- Customization governance and policy checks: `Agent Governance Reviewer`
- Discovering additional relevant Copilot assets: `Awesome Copilot Selector Agent`

### Current project instructions and skills

Active instruction files include:

- `.github/instructions/security-and-owasp.instructions.md`
- `.github/instructions/containerization-docker-best-practices.instructions.md`
- `.github/instructions/github-actions-ci-cd-best-practices.instructions.md`

Active skill folders include:

- `.github/skills/dependabot/`
- `.github/skills/github-actions-hardening/`
- `.github/skills/javascript-typescript-jest/`
- `.github/skills/webapp-testing/`

### Notes

- Agents and prompts are workflow helpers; they do not automatically modify runtime gameplay behavior unless explicitly asked.
- Deployment-related prompts are designed to preserve persistence and avoid unsafe production changes by default.
- Visual prompts enforce original, legally safe, documented asset usage.

## Security Notes

- Server is authoritative for scoring, timing, move validity, and outcomes
- Rate limiting and nonce checks are enforced server-side
- Stale board versions and suspicious activity are flagged
- Do not expose secrets in client-side code or public configs

## Troubleshooting

- If the server warns about missing `DATABASE_URL`, create `server/.env`
- If the client cannot connect in development, verify `REACT_APP_SERVER_URL`
- If data is lost in Docker, mount a volume and make sure `DATABASE_URL` points to that mounted path

## Additional Docs

- Visual assets: `docs/assets.md`
- Marketing static files are served from `marketing/` at `/marketing`
