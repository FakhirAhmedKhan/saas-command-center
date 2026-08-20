<#
.SYNOPSIS
  Fast full-stack test runner for SaaS Command Center (Phases 1-18).

.DESCRIPTION
  Same coverage as the original phase runner script, restructured for speed:

    - Independent build/typecheck steps (shared-types build, validation
      build, tracker build) run in parallel background jobs instead of
      sequentially.
    - All backend Jest e2e spec files run in ONE Jest process
      (--runTestsByPath with every file) instead of one `pnpm exec jest`
      invocation per file. Each invocation previously paid full Node +
      ts-jest + Nest module compile startup cost per file; that fixed cost
      now happens once for the whole suite.
    - Backend e2e files still execute sequentially inside that one process
      (--runInBand, maxWorkers: 1 per apps/api/test/jest-e2e.config.cjs)
      because every spec calls resetDatabase(), which truncates the shared
      Postgres test database. True file-level parallelism is NOT safe here
      and is intentionally not attempted.
    - Per-file PASS/FAIL is recovered by asking Jest for --json output and
      parsing testResults, so the final report keeps the same per-file
      granularity as the original one-process-per-file version.
    - Fixed a real bug: the Playwright phase-12 directory is `phace12` on
      disk (typo baked into the repo), not `phase12` - the original script's
      `phase12` target silently matched nothing and was always skipped.
    - Tracker's own `test` script already runs `pnpm build` internally, so
      it is not redundantly pre-built before also being tested.

.PARAMETER Fast
  Skip Playwright and the frontend production build/lint/typecheck (still
  runs backend build/typecheck, Prisma steps, and all backend e2e). Use for
  a quick backend-only loop.

.PARAMETER SkipBuilds
  Skip the Phase 1-3 build/typecheck/migration steps entirely and jump
  straight to e2e. Use when you already built moments ago and only changed
  test files.

.PARAMETER Only
  Comma-separated phase tags to filter which e2e phases run (matches
  loosely against labels like "PHASE 13", "PHASE 8/12", "PHASE 9"), e.g.
  -Only "13,14,17,18". Skips every other phase's backend/frontend e2e.
  Build/typecheck steps still run unless -SkipBuilds is also passed.

.EXAMPLE
  ./scripts/test-fast-all.ps1
  Full run: builds, all backend e2e, frontend build, all Playwright.

.EXAMPLE
  ./scripts/test-fast-all.ps1 -Fast -Only "13,14,15,16,17,18"
  Backend-only, phases 13-18 only. Good for iterating on the new phases.

.EXAMPLE
  ./scripts/test-fast-all.ps1 -SkipBuilds -Only "18"
  Assumes a build already happened; just runs Phase 18 backend + frontend
  e2e (frontend e2e still runs unless -Fast is also passed).
#>

param(
    [switch]$Fast,
    [switch]$SkipBuilds,
    [string]$Only = ""
)

$ErrorActionPreference = "Continue"
$startedAt = Get-Date

$passed = @()
$failed = @()
$skipped = @()

$onlyPhases = @()
if ($Only.Trim().Length -gt 0) {
    $onlyPhases = $Only.Split(",") | ForEach-Object { $_.Trim() }
}

function Test-PhaseSelected {
    param([string]$PhaseTag)

    if ($onlyPhases.Count -eq 0) {
        return $true
    }

    foreach ($tag in $onlyPhases) {
        if ($PhaseTag -like "*$tag*") {
            return $true
        }
    }

    return $false
}

function Add-Pass {
    param([string]$Name)
    $script:passed += $Name
    Write-Host "PASS: $Name" -ForegroundColor Green
}

function Add-Fail {
    param([string]$Name)
    $script:failed += $Name
    Write-Host "FAIL: $Name" -ForegroundColor Red
}

function Add-Skip {
    param([string]$Name)
    $script:skipped += $Name
    Write-Host "SKIP: $Name" -ForegroundColor DarkYellow
}

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host $Name -ForegroundColor Yellow
    Write-Host "==================================================" -ForegroundColor Cyan

    & $Command

    if ($LASTEXITCODE -eq 0) {
        Add-Pass $Name
    }
    else {
        Add-Fail $Name
    }
}

# ==================================================
# PARALLEL JOB HELPER
# Runs several independent shell commands concurrently as PowerShell jobs,
# waits for all of them, then reports PASS/FAIL per job. Only use this for
# steps that do NOT touch the shared test database - build/typecheck steps
# are safe, e2e spec files are not.
# ==================================================

function Run-ParallelSteps {
    param([hashtable[]]$Steps)

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "PARALLEL: $($Steps.Name -join ', ')" -ForegroundColor Yellow
    Write-Host "==================================================" -ForegroundColor Cyan

    $root = (Get-Location).Path
    $jobs = @()

    foreach ($step in $Steps) {
        $job = Start-Job -Name $step.Name -ScriptBlock {
            param($WorkDir, $Command)
            Set-Location $WorkDir
            Invoke-Expression $Command
            if ($LASTEXITCODE -ne 0) {
                throw "Exit code $LASTEXITCODE"
            }
        } -ArgumentList $root, $step.Command

        $jobs += [pscustomobject]@{ Name = $step.Name; Job = $job }
    }

    foreach ($entry in $jobs) {
        Wait-Job $entry.Job | Out-Null

        $output = Receive-Job $entry.Job -ErrorAction SilentlyContinue -ErrorVariable jobError
        $output | ForEach-Object { Write-Host "[$($entry.Name)] $_" }

        if ($entry.Job.State -eq "Completed" -and -not $jobError) {
            Add-Pass $entry.Name
        }
        else {
            if ($jobError) {
                $jobError | ForEach-Object { Write-Host "[$($entry.Name)] ERROR: $_" -ForegroundColor Red }
            }
            Add-Fail $entry.Name
        }

        Remove-Job $entry.Job -Force
    }
}

Write-Host ""
Write-Host "##################################################" -ForegroundColor Magenta
Write-Host "SAAS COMMAND CENTER - FAST PHASE 1 TO 18" -ForegroundColor Magenta
if ($Fast) { Write-Host "(FAST MODE: skipping Playwright + web build)" -ForegroundColor Magenta }
if ($SkipBuilds) { Write-Host "(SKIP-BUILDS MODE: jumping straight to e2e)" -ForegroundColor Magenta }
if ($onlyPhases.Count -gt 0) { Write-Host "(ONLY PHASES: $($onlyPhases -join ', '))" -ForegroundColor Magenta }
Write-Host "##################################################" -ForegroundColor Magenta


# ==================================================
# FOUNDATION (parallelized where independent)
# ==================================================

if (-not $SkipBuilds) {

    Run-ParallelSteps @(
        @{ Name = "PHASE 1 | Shared Types Build"; Command = "pnpm --filter @command-center/shared-types build" }
        @{ Name = "PHASE 1 | Validation Build"; Command = "pnpm --filter @command-center/validation build" }
        @{ Name = "PHASE 1/9 | Tracker Build"; Command = "pnpm --filter @command-center/tracker build" }
    )

    # API typecheck/build depend on shared-types + validation being built
    # above, so they run after the parallel block finishes, not inside it.
    Run-Step "PHASE 2 | API Typecheck" {
        pnpm --filter @command-center/api typecheck
    }

    Run-Step "PHASE 2 | API Build" {
        pnpm --filter @command-center/api build
    }

    # Prisma steps touch the DB connection/schema - keep sequential and
    # after the build so a broken schema fails fast before spending time on
    # 40+ e2e spec files.
    Run-Step "PHASE 3 | Prisma Validate" {
        pnpm --filter @command-center/api exec prisma validate
    }

    Run-Step "PHASE 3 | Prisma Generate" {
        pnpm --filter @command-center/api exec prisma generate
    }

    Run-Step "PHASE 3 | Migration Status" {
        pnpm --filter @command-center/api exec prisma migrate status
    }
}
else {
    Add-Skip "PHASE 1-3 | Builds/Typecheck/Migrations (-SkipBuilds)"
}


# ==================================================
# API E2E - ALL FILES IN ONE JEST PROCESS
# ==================================================

$apiE2ePlan = @(
    @{ Phase = "PHASE 4/11"; File = "auth.e2e-spec.ts" }
    @{ Phase = "PHASE 4"; File = "workspaces.e2e-spec.ts" }
    @{ Phase = "PHASE 4"; File = "workspace-members.e2e-spec.ts" }
    @{ Phase = "PHASE 4"; File = "workspace-roles.e2e-spec.ts" }

    @{ Phase = "PHASE 5"; File = "applications.e2e-spec.ts" }
    @{ Phase = "PHASE 5"; File = "application-roles.e2e-spec.ts" }
    @{ Phase = "PHASE 5"; File = "application-technologies.e2e-spec.ts" }
    @{ Phase = "PHASE 5"; File = "application-links.e2e-spec.ts" }

    @{ Phase = "PHASE 6"; File = "activity.e2e-spec.ts" }

    @{ Phase = "PHASE 7"; File = "development.e2e-spec.ts" }
    @{ Phase = "PHASE 7"; File = "development-progress.e2e-spec.ts" }
    @{ Phase = "PHASE 7"; File = "development-roles.e2e-spec.ts" }
    @{ Phase = "PHASE 7"; File = "development-activity.e2e-spec.ts" }

    @{ Phase = "PHASE 8/12"; File = "websites.e2e-spec.ts" }
    @{ Phase = "PHASE 8"; File = "website-roles.e2e-spec.ts" }
    @{ Phase = "PHASE 8"; File = "website-environments.e2e-spec.ts" }
    @{ Phase = "PHASE 8"; File = "website-activity.e2e-spec.ts" }

    @{ Phase = "PHASE 9"; File = "analytics-ingestion.e2e-spec.ts" }
    @{ Phase = "PHASE 9"; File = "analytics-ingestion-security.e2e-spec.ts" }
    @{ Phase = "PHASE 9"; File = "analytics-ingestion-rate-limit.e2e-spec.ts" }
    @{ Phase = "PHASE 9"; File = "raw-events.e2e-spec.ts" }
    @{ Phase = "PHASE 9"; File = "tracking-admin.e2e-spec.ts" }

    @{ Phase = "PHASE 10"; File = "analytics-engine-status.e2e-spec.ts" }
    @{ Phase = "PHASE 10"; File = "analytics-engine-processing.e2e-spec.ts" }
    @{ Phase = "PHASE 10/12"; File = "analytics-visitors.e2e-spec.ts" }
    @{ Phase = "PHASE 10/12"; File = "analytics-sessions.e2e-spec.ts" }
    @{ Phase = "PHASE 10/12"; File = "analytics-pageviews.e2e-spec.ts" }
    @{ Phase = "PHASE 10/12"; File = "analytics-aggregates.e2e-spec.ts" }
    @{ Phase = "PHASE 10"; File = "analytics-timezones.e2e-spec.ts" }
    @{ Phase = "PHASE 10"; File = "analytics-late-events.e2e-spec.ts" }
    @{ Phase = "PHASE 10"; File = "analytics-retention.e2e-spec.ts" }
    @{ Phase = "PHASE 10"; File = "analytics-reprocessing.e2e-spec.ts" }

    @{ Phase = "PHASE 13"; File = "phase13-analytics-reports.e2e-spec.ts" }
    @{ Phase = "PHASE 14"; File = "phase14-analytics-processing.e2e-spec.ts" }
    @{ Phase = "PHASE 15"; File = "phase15-monitoring.e2e-spec.ts" }
    @{ Phase = "PHASE 15"; File = "monitoring.e2e-spec.ts" }
    @{ Phase = "PHASE 16"; File = "phase16-releases-deployments.e2e-spec.ts" }
    @{ Phase = "PHASE 17"; File = "phase17-team-operations.e2e-spec.ts" }
    @{ Phase = "PHASE 18"; File = "phase18-webhook-integrations.e2e-spec.ts" }
    @{ Phase = "PHASE 18"; File = "webhooks.e2e-spec.ts" }
)

$apiE2ePaths = @()
foreach ($entry in $apiE2ePlan) {
    if (-not (Test-PhaseSelected $entry.Phase)) {
        continue
    }

    $fullPath = "apps/api/test/$($entry.File)"

    if (Test-Path $fullPath) {
        $apiE2ePaths += "test/$($entry.File)"
    }
    else {
        Add-Skip "$($entry.Phase) | API | $($entry.File) - file not found"
    }
}

if ($apiE2ePaths.Count -gt 0) {

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "API | ALL E2E SPECS IN ONE JEST PROCESS ($($apiE2ePaths.Count) files)" -ForegroundColor Yellow
    Write-Host "==================================================" -ForegroundColor Cyan

    Push-Location "apps/api"

    try {
        $reportPath = "jest-e2e-results.json"

        pnpm exec jest `
            --config "./test/jest-e2e.config.cjs" `
            --runInBand `
            --json `
            --outputFile "$reportPath" `
            --runTestsByPath @apiE2ePaths

        $jestExitCode = $LASTEXITCODE

        if (Test-Path $reportPath) {
            try {
                $report = Get-Content $reportPath -Raw | ConvertFrom-Json

                foreach ($suite in $report.testResults) {
                    $fileName = Split-Path $suite.name -Leaf
                    $planEntry = $apiE2ePlan | Where-Object { $_.File -eq $fileName } | Select-Object -First 1
                    $phaseTag = if ($planEntry) { $planEntry.Phase } else { "PHASE ?" }
                    $label = "$phaseTag | API | $fileName"

                    if ($suite.status -eq "passed") {
                        Add-Pass $label
                    }
                    else {
                        Add-Fail $label
                    }
                }
            }
            catch {
                Write-Host "Could not parse $reportPath, falling back to overall exit code." -ForegroundColor DarkYellow

                if ($jestExitCode -eq 0) {
                    Add-Pass "API | ALL E2E SPECS"
                }
                else {
                    Add-Fail "API | ALL E2E SPECS"
                }
            }

            Remove-Item $reportPath -Force -ErrorAction SilentlyContinue
        }
        else {
            if ($jestExitCode -eq 0) {
                Add-Pass "API | ALL E2E SPECS"
            }
            else {
                Add-Fail "API | ALL E2E SPECS"
            }
        }
    }
    finally {
        Pop-Location
    }
}
else {
    Add-Skip "API | ALL E2E SPECS - nothing selected"
}


# ==================================================
# TRACKER TESTS
# ==================================================

if (Test-PhaseSelected "PHASE 9") {
    $trackerPackage = Get-Content "apps/tracker/package.json" -Raw | ConvertFrom-Json

    if ($trackerPackage.scripts.test) {
        Run-Step "PHASE 9 | Tracker Tests" {
            pnpm --filter @command-center/tracker test
        }
    }
    else {
        Add-Skip "PHASE 9 | Tracker Tests - no test script"
    }
}


# ==================================================
# FRONTEND
# ==================================================

if (-not $Fast) {

    Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue

    Run-Step "WEB | Typecheck" {
        pnpm --filter @command-center/web typecheck
    }

    Run-Step "WEB | Lint" {
        pnpm --filter @command-center/web lint
    }

    Run-Step "WEB | Production Build" {
        pnpm --filter @command-center/web build
    }
}
else {
    Add-Skip "WEB | Typecheck/Lint/Build (-Fast)"
}


# ==================================================
# PLAYWRIGHT
# Real directory is `phace12`, not `phase12`.
# ==================================================

if (-not $Fast) {

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "WEB | ALL PLAYWRIGHT E2E" -ForegroundColor Yellow
    Write-Host "==================================================" -ForegroundColor Cyan

    $playwrightPlan = @(
        @{ Phase = "BATCH10"; Dir = "e2e/batch10" }
        @{ Phase = "BATCH11"; Dir = "e2e/batch11" }
        @{ Phase = "FULLSTACK"; Dir = "e2e/full-stack" }
        @{ Phase = "PHASE 12"; Dir = "e2e/phace12" }
        @{ Phase = "PHASE 13"; Dir = "e2e/phase13" }
        @{ Phase = "PHASE 14"; Dir = "e2e/phase14" }
        @{ Phase = "PHASE 15"; Dir = "e2e/phase15" }
        @{ Phase = "PHASE 16"; Dir = "e2e/phase16" }
        @{ Phase = "PHASE 17"; Dir = "e2e/phase17" }
        @{ Phase = "PHASE 18"; Dir = "e2e/phase18" }
    )

    $existingTargets = @()

    foreach ($entry in $playwrightPlan) {
        if (-not (Test-PhaseSelected $entry.Phase)) {
            continue
        }

        if (Test-Path "apps/web/$($entry.Dir)") {
            $existingTargets += $entry.Dir
        }
        else {
            Add-Skip "WEB | $($entry.Dir) - directory not found"
        }
    }

    if ($existingTargets.Count -gt 0) {

        Push-Location "apps/web"

        try {
            pnpm exec playwright test $existingTargets

            if ($LASTEXITCODE -eq 0) {
                Add-Pass "WEB | ALL PLAYWRIGHT E2E"
            }
            else {
                Add-Fail "WEB | ALL PLAYWRIGHT E2E"
            }
        }
        finally {
            Pop-Location
        }
    }
    else {
        Add-Skip "WEB | ALL PLAYWRIGHT E2E - nothing selected"
    }
}
else {
    Add-Skip "WEB | ALL PLAYWRIGHT E2E (-Fast)"
}


# ==================================================
# FINAL REPORT
# ==================================================

$elapsed = (Get-Date) - $startedAt

Write-Host ""
Write-Host ""
Write-Host "##################################################" -ForegroundColor Cyan
Write-Host "FAST PHASE 1-18 TEST REPORT" -ForegroundColor Yellow
Write-Host "##################################################" -ForegroundColor Cyan

Write-Host ""
Write-Host "PASSED: $($passed.Count)" -ForegroundColor Green

foreach ($item in $passed) {
    Write-Host "  PASS  $item" -ForegroundColor Green
}

Write-Host ""
Write-Host "FAILED: $($failed.Count)" -ForegroundColor Red

foreach ($item in $failed) {
    Write-Host "  FAIL  $item" -ForegroundColor Red
}

Write-Host ""
Write-Host "SKIPPED: $($skipped.Count)" -ForegroundColor DarkYellow

foreach ($item in $skipped) {
    Write-Host "  SKIP  $item" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "Elapsed: $([math]::Round($elapsed.TotalMinutes, 1)) minutes" -ForegroundColor Cyan
Write-Host ""

if ($failed.Count -eq 0) {
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "PHASE 1-18 FULL VERIFICATION PASSED" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host "PHASE 1-18 HAS $($failed.Count) FAILED CHECK(S)" -ForegroundColor Red
    Write-Host "==================================================" -ForegroundColor Red
    exit 1
}
