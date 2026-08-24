import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import prettier from 'prettier';

const root = process.cwd();
const require = createRequire(import.meta.url);

/*
 * IMPORTANT
 * ---------
 * Do NOT spawn pnpm.cmd from Node on Windows.
 *
 * Node 24 + Windows can produce:
 *
 *   spawnSync pnpm.cmd EINVAL
 *
 * Instead resolve ESLint once and execute its JS entrypoint
 * directly through the CURRENT Node executable.
 */
const eslintPackage = require.resolve('eslint/package.json');

const eslintBin = path.join(path.dirname(eslintPackage), 'bin', 'eslint.js');

if (!fs.existsSync(eslintBin)) {
  console.error(`ESLint binary not found: ${eslintBin}`);
  process.exit(1);
}

const expectedRules = ['import/no-duplicates', 'import/order', 'import/newline-after-import', 'import/first', '@stylistic/padding-line-between-statements'];

/*
 * Production + test workspaces that should receive
 * the shared formatting/import policy.
 */
const workspaces = [
  {
    name: '@command-center/api',
    dir: 'apps/api',
    requireLintScript: true,
  },
  {
    name: '@command-center/tracker',
    dir: 'apps/tracker',
    requireLintScript: true,
  },
  {
    name: '@command-center/web',
    dir: 'apps/web',
    requireLintScript: true,
  },
  {
    name: '@command-center/shared-types',
    dir: 'packages/shared-types',
    requireLintScript: true,
  },
  {
    name: '@command-center/ui',
    dir: 'packages/ui',
    requireLintScript: true,
  },

  /*
   * TEST CODE IS FIRST-CLASS COVERAGE.
   */
  {
    name: '@command-center/api-tests',
    dir: 'packages/test-code/api',
    requireLintScript: true,
  },
  {
    name: '@command-center/tracker-tests',
    dir: 'packages/test-code/tracker',
    requireLintScript: true,
  },
  {
    name: '@command-center/web-tests',
    dir: 'packages/test-code/web',
    requireLintScript: true,
  },
];

const ignoredDirectories = new Set(['node_modules', '.next', 'dist', 'dist-cjs', 'build', 'out', 'coverage', 'generated', 'playwright-report', 'playwright-report-fullstack', 'test-results']);

const supportedExtensions = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',

  /*
   * Required for tracker/test/config code.
   */
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
]);

function isIgnoredFile(file) {
  const name = path.basename(file);

  return name === 'next-env.d.ts' || name.endsWith('.d.ts') || name === 'eslint.config.mjs' || name === 'eslint.config.js' || name === 'eslint.config.cjs';
}

function collectSamples(directory, output = []) {
  if (!fs.existsSync(directory)) {
    return output;
  }

  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true,
  })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      collectSamples(absolute, output);

      continue;
    }

    const extension = path.extname(entry.name);

    if (supportedExtensions.has(extension) && !isIgnoredFile(absolute)) {
      output.push(absolute);
    }
  }

  return output;
}

function chooseSample(workspaceDirectory) {
  const samples = collectSamples(workspaceDirectory);

  if (samples.length === 0) {
    return null;
  }

  /*
   * Prefer src/test/e2e/unit code over configuration files.
   */
  const preferred = samples.find((file) => {
    const relative = path.relative(workspaceDirectory, file).replaceAll('\\', '/');

    return relative.startsWith('src/') || relative.startsWith('test/') || relative.startsWith('tests/') || relative.startsWith('unit/') || relative.startsWith('e2e/');
  });

  return preferred ?? samples[0];
}

function runEslint(args, cwd) {
  try {
    return execFileSync(process.execPath, [eslintBin, ...args], {
      cwd,
      encoding: 'utf8',

      /*
       * Keep stdout parseable.
       * Capture stderr so failures can be printed cleanly.
       */
      stdio: ['ignore', 'pipe', 'pipe'],

      windowsHide: true,
    });
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr) : '';

    const stdout = error?.stdout ? String(error.stdout) : '';

    const wrapped = new Error([`ESLint failed in ${cwd}`, stdout, stderr].filter(Boolean).join('\n'));

    wrapped.originalError = error;

    throw wrapped;
  }
}

function readPackageJson(directory) {
  const file = path.join(directory, 'package.json');

  if (!fs.existsSync(file)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

let failed = false;

const summary = [];

console.log('');
console.log('====================================================================');
console.log(' ESLINT + PRETTIER FULL MONOREPO VERIFICATION');
console.log('====================================================================');

console.log('');
console.log(`Node:       ${process.version}`);
console.log(`Platform:   ${process.platform}`);
console.log(`ESLint bin: ${eslintBin}`);

/* ==================================================================
 * CONFIG FILE / SCRIPT COVERAGE
 * ================================================================== */

console.log('');
console.log('====================================================================');
console.log(' 1. WORKSPACE LINT COVERAGE');
console.log('====================================================================');

for (const workspace of workspaces) {
  const absoluteWorkspace = path.join(root, workspace.dir);

  const packageJson = readPackageJson(absoluteWorkspace);

  const eslintConfigCandidates = ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.cjs'];

  const eslintConfig = eslintConfigCandidates.find((candidate) => fs.existsSync(path.join(absoluteWorkspace, candidate)));

  const lintScript = packageJson?.scripts?.lint;

  console.log('');
  console.log(workspace.name);

  if (!eslintConfig) {
    console.error('  FAIL: ESLint config missing');

    failed = true;
  } else {
    console.log(`  PASS: ${eslintConfig}`);
  }

  if (workspace.requireLintScript && !lintScript) {
    console.error('  FAIL: package.json lint script missing');

    failed = true;
  } else {
    console.log(`  PASS: lint script = ${lintScript}`);
  }
}

/* ==================================================================
 * EFFECTIVE ESLINT RULES + PRETTIER
 * ================================================================== */

console.log('');
console.log('====================================================================');
console.log(' 2. EFFECTIVE RULE VERIFICATION');
console.log('====================================================================');

for (const workspace of workspaces) {
  const absoluteWorkspace = path.join(root, workspace.dir);

  const sample = chooseSample(absoluteWorkspace);

  console.log('');
  console.log('--------------------------------------------------------------------');
  console.log(workspace.name);

  if (!sample) {
    console.error('  FAIL: no JS/TS source/test sample found');

    failed = true;

    summary.push({
      workspace: workspace.name,
      sample: 'NONE',
      eslint: 'FAIL',
      prettier: 'FAIL',
    });

    continue;
  }

  const relative = path.relative(absoluteWorkspace, sample);

  console.log(`  Sample: ${relative}`);

  let eslintStatus = 'PASS';

  try {
    const raw = runEslint(['--print-config', relative], absoluteWorkspace);

    let config;

    try {
      config = JSON.parse(raw);
    } catch {
      console.error('  FAIL: ESLint --print-config output is not valid JSON');

      console.error(raw.slice(0, 1500));

      failed = true;
      eslintStatus = 'FAIL';
      config = null;
    }

    if (config) {
      for (const rule of expectedRules) {
        const value = config.rules?.[rule];

        if (!value) {
          console.error(`  FAIL: ${rule} NOT ACTIVE`);

          failed = true;
          eslintStatus = 'FAIL';
        } else {
          console.log(`  PASS: ${rule}`);
        }
      }
    }
  } catch (error) {
    console.error('  FAIL: eslint --print-config failed');

    console.error(String(error.message).split('\n').slice(0, 30).join('\n'));

    failed = true;
    eslintStatus = 'FAIL';
  }

  let prettierStatus = 'PASS';

  const prettierConfig = await prettier.resolveConfig(sample);

  if (!prettierConfig) {
    console.error('  FAIL: Prettier config not resolved');

    failed = true;
    prettierStatus = 'FAIL';
  } else {
    const expectedPrettier = {
      printWidth: 220,
      singleQuote: true,
      jsxSingleQuote: true,
      singleAttributePerLine: false,
      semi: true,
      trailingComma: 'all',
    };

    for (const [key, expected] of Object.entries(expectedPrettier)) {
      const actual = prettierConfig[key];

      if (actual !== expected) {
        console.error(`  FAIL: Prettier ${key}: expected ${String(expected)}, received ${String(actual)}`);

        failed = true;
        prettierStatus = 'FAIL';
      } else {
        console.log(`  PASS: Prettier ${key} = ${String(actual)}`);
      }
    }
  }

  summary.push({
    workspace: workspace.name,
    sample: relative,
    eslint: eslintStatus,
    prettier: prettierStatus,
  });
}

/* ==================================================================
 * REAL AUTO-FIX TEST — WEB
 * ================================================================== */

console.log('');
console.log('====================================================================');
console.log(' 3. REAL AUTO-FIX BEHAVIOR — WEB');
console.log('====================================================================');

const webDir = path.join(root, 'apps/web');

const webBehaviorDir = path.join(webDir, 'src/__eslint_behavior_test__');

const webBehaviorFile = path.join(webBehaviorDir, 'behavior-test.ts');

fs.mkdirSync(webBehaviorDir, {
  recursive: true,
});

fs.writeFileSync(webBehaviorFile, ['const first = 1;', '', 'const second = 2;', '', 'const third = first + second;', '', 'export const result = third;', ''].join('\n'), 'utf8');

try {
  runEslint(['src/__eslint_behavior_test__/behavior-test.ts', '--fix'], webDir);

  const fixed = fs.readFileSync(webBehaviorFile, 'utf8');

  console.log('');
  console.log(fixed);

  const unwantedBlankLines = /const first = 1;\s*\n\s*\n\s*const second/.test(fixed) || /const second = 2;\s*\n\s*\n\s*const third/.test(fixed);

  if (unwantedBlankLines) {
    console.error('FAIL: declaration blank lines remain');

    failed = true;
  } else {
    console.log('PASS: consecutive declarations compacted');
  }
} catch (error) {
  console.error('FAIL: Web behavior test could not execute');

  console.error(error.message);

  failed = true;
} finally {
  fs.rmSync(webBehaviorDir, {
    recursive: true,
    force: true,
  });
}

/* ==================================================================
 * REAL AUTO-FIX TEST — API TEST CODE
 * ================================================================== */

console.log('');
console.log('====================================================================');
console.log(' 4. REAL AUTO-FIX BEHAVIOR — TEST CODE');
console.log('====================================================================');

const apiTestsDir = path.join(root, 'packages/test-code/api');

const testBehaviorDir = path.join(apiTestsDir, '__eslint_behavior_test__');

const testBehaviorFile = path.join(testBehaviorDir, 'behavior-test.ts');

fs.mkdirSync(testBehaviorDir, {
  recursive: true,
});

fs.writeFileSync(testBehaviorFile, ['const fixtureA = 1;', '', 'const fixtureB = 2;', '', 'const fixtureC = fixtureA + fixtureB;', '', 'export const fixtureResult = fixtureC;', ''].join('\n'), 'utf8');

try {
  runEslint(['__eslint_behavior_test__/behavior-test.ts', '--fix'], apiTestsDir);

  const fixed = fs.readFileSync(testBehaviorFile, 'utf8');

  console.log('');
  console.log(fixed);

  const unwantedBlankLines = /const fixtureA = 1;\s*\n\s*\n\s*const fixtureB/.test(fixed);

  if (unwantedBlankLines) {
    console.error('FAIL: test-code declaration blank lines remain');

    failed = true;
  } else {
    console.log('PASS: test-code declarations compacted');
  }
} catch (error) {
  console.error('FAIL: Test-code behavior test could not execute');

  console.error(error.message);

  failed = true;
} finally {
  fs.rmSync(testBehaviorDir, {
    recursive: true,
    force: true,
  });
}

/* ==================================================================
 * REAL AUTO-FIX TEST — TRACKER MJS TEST CODE
 * ================================================================== */

console.log('');
console.log('====================================================================');
console.log(' 5. TRACKER JS/MJS TEST COVERAGE');
console.log('====================================================================');

const trackerTestsDir = path.join(root, 'packages/test-code/tracker');

const trackerBehaviorDir = path.join(trackerTestsDir, '__eslint_behavior_test__');

const trackerBehaviorFile = path.join(trackerBehaviorDir, 'behavior-test.mjs');

fs.mkdirSync(trackerBehaviorDir, {
  recursive: true,
});

fs.writeFileSync(trackerBehaviorFile, ['const trackerA = 1;', '', 'const trackerB = 2;', '', 'export const trackerResult = trackerA + trackerB;', ''].join('\n'), 'utf8');

try {
  runEslint(['__eslint_behavior_test__/behavior-test.mjs', '--fix'], trackerTestsDir);

  const fixed = fs.readFileSync(trackerBehaviorFile, 'utf8');

  const unwantedBlankLines = /const trackerA = 1;\s*\n\s*\n\s*const trackerB/.test(fixed);

  if (unwantedBlankLines) {
    console.error('FAIL: Tracker MJS declaration blank lines remain');

    failed = true;
  } else {
    console.log('PASS: Tracker JS/MJS code receives shared style rules');
  }
} catch (error) {
  console.error('FAIL: Tracker MJS behavior test could not execute');

  console.error(error.message);

  failed = true;
} finally {
  fs.rmSync(trackerBehaviorDir, {
    recursive: true,
    force: true,
  });
}

/* ==================================================================
 * SUMMARY
 * ================================================================== */

console.log('');
console.log('====================================================================');
console.log(' FINAL COVERAGE SUMMARY');
console.log('====================================================================');

for (const item of summary) {
  console.log('');
  console.log(item.workspace);
  console.log(`  Sample:   ${item.sample}`);
  console.log(`  ESLint:   ${item.eslint}`);
  console.log(`  Prettier: ${item.prettier}`);
}

console.log('');

if (failed) {
  console.error('====================================================================');
  console.error(' ESLINT / PRETTIER FULL COVERAGE VERIFICATION FAILED');
  console.error('====================================================================');

  process.exit(1);
}

console.log('====================================================================');
console.log(' FULL MONOREPO ESLINT + PRETTIER COVERAGE VERIFIED ✅');
console.log('====================================================================');

console.log('');
console.log('Covered:');
console.log('✅ API production TypeScript');
console.log('✅ Tracker production JS/TS');
console.log('✅ Web production TS/TSX');
console.log('✅ Shared Types');
console.log('✅ UI');
console.log('✅ API unit/E2E test code');
console.log('✅ Tracker JS/MJS test code');
console.log('✅ Web unit/Playwright test code');
console.log('✅ Import ordering');
console.log('✅ Import duplication');
console.log('✅ One line after imports');
console.log('✅ Compact consecutive const/let/var');
console.log('✅ Prettier printWidth 220');
console.log('✅ Compact JSX policy');
