#!/bin/sh
set -e

# Apply schema to the database (creates it on first run; safe to re-run).
cd /app/server
./node_modules/.bin/prisma db push --skip-generate

exec node index.js
