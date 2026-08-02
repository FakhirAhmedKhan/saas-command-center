$ErrorActionPreference = "Stop"

Write-Host "Enabling Corepack and pnpm..."
corepack enable
corepack prepare pnpm@11.0.0 --activate

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example"
}

if (-not (Test-Path "apps/web/.env.local")) {
  Copy-Item "apps/web/.env.example" "apps/web/.env.local"
  Write-Host "Created apps/web/.env.local"
}

Write-Host "Installing dependencies..."
pnpm install

Write-Host "Starting PostgreSQL containers..."
pnpm db:up

Write-Host "Setup complete. Run: pnpm dev"
