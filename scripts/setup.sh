#!/usr/bin/env bash
set -euo pipefail

corepack enable
corepack prepare pnpm@11.0.0 --activate

[ -f .env ] || cp .env.example .env
[ -f apps/web/.env.local ] || cp apps/web/.env.example apps/web/.env.local

pnpm install
pnpm db:up

echo "Setup complete. Run: pnpm dev"
