# Marketing Site

## Overview

This folder contains a separate static marketing website for Celestial Break. It promotes the game, explains the rules, highlights competitive features, and renders the public read-only leaderboard endpoint when available.

## Files Included

- `index.html` - standalone landing page markup
- `styles.css` - responsive visual design, motion handling, and component styling
- `script.js` - mobile navigation and safe leaderboard fetching/rendering
- `assets/icon.svg` - original favicon for the marketing site
- `assets/og-card.svg` - original social preview asset

## Local Preview

Recommended options:

1. Serve the main app and open `http://localhost:3000/marketing/` after building the client and starting the server.
2. Open `marketing/index.html` directly for static review.

If you open the file directly and need a different destination for the main game, edit the `data-play-url` value on the `<body>` element in `index.html`.

## Leaderboard Data

The marketing page reads the existing public leaderboard API:

- `GET /api/leaderboard?period=all-time`
- `GET /api/leaderboard?period=weekly`

Behavior:

- loading state while requests are in flight
- error state if the public API is unavailable
- empty state if ranked data has not been recorded yet
- read-only rendering only; no client-side writes are performed

If the API origin differs from the marketing site origin during local testing, append `?api=http://localhost:3000` to the marketing URL. In production, same-origin serving is the intended path.

## Deployment Notes

The server can safely expose this folder at `/marketing/` without changing the main React client route. The primary Play call-to-action currently points to `/`, which is the served game client route in this repository.

If deployment needs a different game URL later, update:

- `data-play-url` on the `<body>` element in `marketing/index.html`

## Asset Notes

`assets/icon.svg` and `assets/og-card.svg` are original SVG assets created for this marketing site. They do not depend on third-party copyrighted artwork.

## Accessibility and Mobile Support

The page uses semantic sections, keyboard-focus styles, skip navigation, descriptive button text, high-contrast text, and `prefers-reduced-motion` handling. Layouts are designed to stack cleanly on narrow screens and keep leaderboard content readable without horizontal scrolling.

## Security Notes

- No secrets or credentials are stored in this folder.
- Leaderboard requests are public read-only `GET` requests.
- External links use `rel="noopener noreferrer"`.
- Script rendering uses DOM text assignment instead of unsafe HTML injection.
