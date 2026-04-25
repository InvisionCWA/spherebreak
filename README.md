# Sphere Break

Sphere Break is a two-player turn-based browser game built with React, Node.js, Express, and Socket.IO. Players join the same match, select coins from the board to build a sum, and try to match the digits of the current core value from right to left.

The server handles matchmaking, game state, scoring, turn timers, and board generation. The client renders the board, player status, timer, and move feedback in real time.

## How The Game Works

- Two players are matched into the same room.
- Each match starts with a 16-coin board, a random three-digit core value, and a quota.
- On your turn, you select one or more coins and submit them in order.
- Normal coins add their face value to the running sum.
- Multiplier coins add their face value and multiply the score gained from a successful move.
- Echo coins repeat the value of the previous non-echo coin.
- A move succeeds when the submitted sum matches at least the required number of core digits from right to left.
- A full core break happens when every digit matches. This awards an additional bonus.
- Successful moves increase the active player's chain and let that player continue their turn.
- Failed moves or timer expiry pass the turn to the other player and reset the chain.
- The game ends after the configured round limit, and the player with the highest score wins.

## Tech Stack

- Client: React 18, react-scripts, Socket.IO client
- Server: Node.js, Express, Socket.IO
- Testing: Jest
- Containerization: Docker, Docker Compose

## Project Structure

```text
.
|-- client/   # React frontend
|-- server/   # Express + Socket.IO game server and game engine
|-- Dockerfile
`-- docker-compose.yml
```

## Prerequisites

- Node.js 20 or later recommended
- npm
- Docker Desktop (optional, for containerized runs)

## Install

Install dependencies for both parts of the app:

```bash
cd client
npm install
```

```bash
cd server
npm install
```

## Run Locally

There are two practical ways to run the project locally.

### Option 1: Run The Production-Style App Locally

Build the React client, then start the Node server that serves the static frontend and websocket API on port 3000.

```bash
cd client
npm run build
```

```bash
cd server
npm start
```

Open http://localhost:3000 in your browser.

### Option 2: Run Client And Server Separately For Development

The server uses port 3000 by default. Since the React dev server also defaults to port 3000, start the client on a different port and point it at the backend explicitly.

Start the server:

```bash
cd server
npm run dev
```

Start the client in a second terminal:

```bash
cd client
$env:PORT=3001
$env:REACT_APP_SERVER_URL='http://localhost:3000'
npm start
```

Open http://localhost:3001 in your browser.

## Run With Docker

Build and start the full app:

```bash
docker compose up --build
```

The app will be available at http://localhost:3000.

On the first run, Docker builds the React client and bundles it into the server image automatically. After that, you can start the existing image again with:

```bash
docker compose up
```

To stop it:

```bash
docker compose down
```

## Tests

Run the server-side test suite:

```bash
cd server
npm test
```

## Available Scripts

### Client

- `npm start` starts the React development server.
- `npm run build` builds the production frontend.
- `npm test` runs the client test runner.

### Server

- `npm start` starts the production server.
- `npm run dev` starts the server with nodemon.
- `npm test` runs the Jest test suite.

## Notes

- The server serves the built client from `client/build` in production mode.
- The client connects to `REACT_APP_SERVER_URL` when provided; otherwise it uses the current page origin.
- A match needs two connected players before gameplay begins.
