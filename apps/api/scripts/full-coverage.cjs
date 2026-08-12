const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { createCoverageMap } = require('istanbul-lib-coverage');
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');

const apiRoot = path.resolve(__dirname, '..');
const testRoot = path.join(apiRoot, 'test');

const coverageRoot = path.join(apiRoot, 'coverage', 'full');
const runsRoot = path.join(coverageRoot, 'runs');
const finalRoot = path.join(coverageRoot, 'report');

const jestBin = require.resolve('jest/bin/jest');

function relativeUnixPath(file) {
  return path.relative(apiRoot, file).split(path.sep).join('/');
}

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function discoverE2eFiles(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...discoverE2eFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.e2e-spec.ts')) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function runJest(label, args) {
  console.log('');
  console.log('============================================================');
  console.log(label);
  console.log('============================================================');

  const result = spawnSync(process.execPath, [jestBin, ...args], {
    cwd: apiRoot,
    env: {
      ...process.env,
      FORCE_COLOR: '1',
    },
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}.`);
  }
}

function mergeCoverageFiles(files) {
  const merged = createCoverageMap({});

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const coverage = JSON.parse(raw);

    merged.merge(coverage);
  }

  return merged;
}

function percentage(covered, total) {
  if (total === 0) {
    return 100;
  }

  return Number(((covered / total) * 100).toFixed(2));
}

function summaryFor(coverageMap) {
  const summary = coverageMap.getCoverageSummary();

  return {
    statements: {
      covered: summary.statements.covered,
      total: summary.statements.total,
      pct: percentage(summary.statements.covered, summary.statements.total),
    },

    branches: {
      covered: summary.branches.covered,
      total: summary.branches.total,
      pct: percentage(summary.branches.covered, summary.branches.total),
    },

    functions: {
      covered: summary.functions.covered,
      total: summary.functions.total,
      pct: percentage(summary.functions.covered, summary.functions.total),
    },

    lines: {
      covered: summary.lines.covered,
      total: summary.lines.total,
      pct: percentage(summary.lines.covered, summary.lines.total),
    },
  };
}

fs.rmSync(coverageRoot, {
  recursive: true,
  force: true,
});

fs.mkdirSync(runsRoot, {
  recursive: true,
});

fs.mkdirSync(finalRoot, {
  recursive: true,
});

/*
 * ----------------------------------------------------------
 * UNIT COVERAGE
 * ----------------------------------------------------------
 *
 * Keep collectCoverageFrom enabled here.
 *
 * This establishes the complete backend source-file universe,
 * including files currently at zero coverage.
 */

const unitDirectory = path.join(runsRoot, 'unit');

runJest('UNIT COVERAGE', ['--config', 'jest.config.cjs', '--runInBand', '--coverage', `--coverageDirectory=${unitDirectory}`, '--coverageReporters=json']);

/*
 * ----------------------------------------------------------
 * E2E COVERAGE
 * ----------------------------------------------------------
 *
 * Run every E2E suite in its own Jest process.
 */

const e2eFiles = discoverE2eFiles(testRoot);

console.log('');
console.log(`Discovered ${e2eFiles.length} E2E suites.`);

for (let index = 0; index < e2eFiles.length; index += 1) {
  const testFile = e2eFiles[index];

  const relativeTestFile = relativeUnixPath(testFile);

  const runDirectory = path.join(runsRoot, `e2e-${String(index + 1).padStart(2, '0')}-${sanitizeFileName(path.basename(testFile))}`);

  runJest(`E2E COVERAGE ${index + 1}/${e2eFiles.length} - ${relativeTestFile}`, [
    '--config',
    'test/jest-e2e.coverage.config.cjs',

    '--runInBand',

    '--runTestsByPath',
    relativeTestFile,

    '--coverage',

    `--coverageDirectory=${runDirectory}`,

    '--coverageReporters=json',
  ]);
}

/*
 * ----------------------------------------------------------
 * DISCOVER COVERAGE JSON FILES
 * ----------------------------------------------------------
 */

const coverageFiles = [];

for (const directory of fs.readdirSync(runsRoot, {
  withFileTypes: true,
})) {
  if (!directory.isDirectory()) {
    continue;
  }

  const coverageFile = path.join(runsRoot, directory.name, 'coverage-final.json');

  if (fs.existsSync(coverageFile)) {
    coverageFiles.push(coverageFile);
  }
}

if (coverageFiles.length !== e2eFiles.length + 1) {
  throw new Error(`Expected ${e2eFiles.length + 1} coverage files but found ${coverageFiles.length}.`);
}

/*
 * ----------------------------------------------------------
 * MERGE
 * ----------------------------------------------------------
 */

console.log('');
console.log('============================================================');
console.log('MERGING COVERAGE');
console.log('============================================================');

const mergedCoverage = mergeCoverageFiles(coverageFiles);

fs.writeFileSync(path.join(finalRoot, 'coverage-final.json'), JSON.stringify(mergedCoverage.toJSON()));

/*
 * ----------------------------------------------------------
 * REPORTS
 * ----------------------------------------------------------
 */

const reportContext = libReport.createContext({
  dir: finalRoot,
  coverageMap: mergedCoverage,
});

for (const reporter of ['text', 'text-summary', 'html', 'lcovonly']) {
  reports.create(reporter).execute(reportContext);
}

/*
 * ----------------------------------------------------------
 * MACHINE-READABLE SUMMARY
 * ----------------------------------------------------------
 */

const finalSummary = summaryFor(mergedCoverage);

fs.writeFileSync(path.join(finalRoot, 'coverage-summary.json'), JSON.stringify(finalSummary, null, 2));

console.log('');
console.log('============================================================');
console.log('FULL API COVERAGE COMPLETE');
console.log('============================================================');

console.log(`Statements : ${finalSummary.statements.pct}%`);

console.log(`Branches   : ${finalSummary.branches.pct}%`);

console.log(`Functions  : ${finalSummary.functions.pct}%`);

console.log(`Lines      : ${finalSummary.lines.pct}%`);

console.log('');
console.log(`HTML report: ${path.join(finalRoot, 'index.html')}`);
console.log(`JSON report: ${path.join(finalRoot, 'coverage-summary.json')}`);
