// Emits a `{ "type": "commonjs" }` marker into a CJS build output directory.
// The packages are `"type": "module"`, so without this marker Node parses the
// generated .js files as ESM and the `require` export condition fails.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const target = process.argv[2];

if (!target) {
  console.error('Usage: node write-cjs-marker.mjs <output-dir>');
  process.exit(1);
}

const directory = resolve(process.cwd(), target);

await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, 'package.json'), `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`);
