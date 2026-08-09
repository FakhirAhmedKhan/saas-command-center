const fs = require('node:fs');
const path = require('node:path');

const buildScript = path.join(process.cwd(), 'apps/tracker/scripts/build.mjs');

if (!fs.existsSync(buildScript)) {
  throw new Error(`Build script not found: ${buildScript}`);
}

const backupPath = `${buildScript}.windows-path-backup`;

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(buildScript, backupPath);

  console.log(`Backup created: ${backupPath}`);
}

let content = fs.readFileSync(buildScript, 'utf8');

/*
 * Add fileURLToPath import.
 */
const nodeUrlImport = /import\s*\{([^}]*)\}\s*from\s*['"]node:url['"];?/m;

if (nodeUrlImport.test(content)) {
  content = content.replace(nodeUrlImport, (fullMatch, imports) => {
    if (
      imports
        .split(',')
        .map((item) => item.trim())
        .includes('fileURLToPath')
    ) {
      return fullMatch;
    }

    return `import { ${imports.trim()}, fileURLToPath } from 'node:url';`;
  });
} else {
  content = `import { fileURLToPath } from 'node:url';\n${content}`;
}

/*
 * Fix patterns such as:
 *
 * new URL('../src/tracker.ts', import.meta.url).pathname
 *
 * new URL('..', import.meta.url).pathname
 */
let replacements = 0;

content = content.replace(/new\s+URL\(\s*(['"`][^'"`]+['"`])\s*,\s*import\.meta\.url\s*\)\.pathname/g, (_match, relativePath) => {
  replacements += 1;

  return `fileURLToPath(new URL(${relativePath}, import.meta.url))`;
});

/*
 * Fix:
 *
 * new URL(import.meta.url).pathname
 */
content = content.replace(/new\s+URL\(\s*import\.meta\.url\s*\)\.pathname/g, () => {
  replacements += 1;

  return 'fileURLToPath(import.meta.url)';
});

/*
 * Fix:
 *
 * import.meta.url.pathname
 *
 * This is uncommon, but included for safety.
 */
content = content.replace(/import\.meta\.url\.pathname/g, () => {
  replacements += 1;

  return 'fileURLToPath(import.meta.url)';
});

if (replacements === 0) {
  console.log('');
  console.log('No direct URL pathname pattern was found.');
  console.log('Showing the current build script:');
  console.log('');
  console.log(content);

  process.exitCode = 2;
} else {
  fs.writeFileSync(buildScript, content, 'utf8');

  console.log(`Fixed ${replacements} Windows path conversion occurrence(s).`);

  console.log(`Updated: ${buildScript}`);
}
