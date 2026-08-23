$ErrorActionPreference = 'Stop'

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host " $Name" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan

    & $Command

    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }

    Write-Host "PASS: $Name" -ForegroundColor Green
}

Write-Host ""
Write-Host "DESKTOP PHASES 15-18 VERIFICATION" -ForegroundColor Cyan
Write-Host "No production/Neon database mutation is performed by this script." -ForegroundColor Yellow

Run-Step 'Prisma format' {
    pnpm --dir apps/api exec prisma format
}

Run-Step 'Prisma validate' {
    pnpm --dir apps/api exec prisma validate
}

Run-Step 'Prisma generate' {
    pnpm --dir apps/api exec prisma generate
}

Run-Step 'Shared types build' {
    pnpm --filter @command-center/shared-types build
}

Run-Step 'API typecheck' {
    pnpm --filter @command-center/api typecheck
}

Run-Step 'Web typecheck' {
    pnpm --filter @command-center/web typecheck
}

Run-Step 'API lint' {
    pnpm --filter @command-center/api lint
}

Run-Step 'Web lint' {
    pnpm --filter @command-center/web lint
}

Run-Step 'API build' {
    pnpm --filter @command-center/api build
}

Run-Step 'Web build' {
    pnpm --filter @command-center/web build
}

$desktopApiTests = @(
    'desktop-alerts.e2e-spec.ts',
    'desktop-ai-analysis.e2e-spec.ts',
    'desktop-security.e2e-spec.ts',
    'desktop-full-flow.e2e-spec.ts'
)

foreach ($testFile in $desktopApiTests) {
    Run-Step "API E2E: $testFile" {
        pnpm --dir apps/api exec jest `
          --config ../../packages/test-code/api/jest-e2e.config.cjs `
          --runInBand `
          --runTestsByPath "../../packages/test-code/api/e2e/$testFile"
    }
}

Run-Step 'Desktop Phase 15-17 frontend unit tests' {
    pnpm --filter @command-center/web-tests exec vitest run `
      unit/features/desktop-apps/desktop-alerts.test.tsx `
      unit/features/desktop-apps/desktop-analysis-panel.test.tsx `
      unit/features/desktop-apps/desktop-permission-gate.test.tsx `
      unit/features/desktop-apps/desktop-apps-api-phase15-17.test.ts
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " PHASE 15-18 TARGETED VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Run the full regression matrix below before declaring Phase 18 PASS." -ForegroundColor Yellow