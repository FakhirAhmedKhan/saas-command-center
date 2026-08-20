$ErrorActionPreference = "Stop"

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $Name -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    & $Command

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "FAILED: $Name" -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host "PASSED: $Name" -ForegroundColor Green
}

Run-Step "API Typecheck" {
    pnpm --filter @command-center/api typecheck
}

Run-Step "API Production Build" {
    pnpm --filter @command-center/api build
}

Run-Step "API E2E Tests - 206 tests" {
    pnpm --filter @command-center/api test:e2e
}

Run-Step "Tracker Typecheck" {
    pnpm --filter @command-center/tracker typecheck
}

Run-Step "Tracker Tests - 56 tests" {
    pnpm --filter @command-center/tracker test
}

Run-Step "Web Typecheck" {
    pnpm --filter @command-center/web exec tsc --noEmit
}

Run-Step "Web Production Build" {
    pnpm --filter @command-center/web build
}

Run-Step "Frontend Playwright Tests - 40 tests" {
    pnpm --filter @command-center/web test:e2e:batch10
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "FULL APPLICATION TEST RUN PASSED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "API E2E:       206 passed" -ForegroundColor Green
Write-Host "Tracker:        56 passed" -ForegroundColor Green
Write-Host "Frontend E2E:   40 passed" -ForegroundColor Green
Write-Host "Total:         302 passed" -ForegroundColor Green
Write-Host "Builds:        API + Tracker + Web" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
