import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = process.cwd();

const targets = [
  {
    name: 'API',
    dir: 'apps/api/dist',
    gzip: false,
  },
  {
    name: 'Web Client',
    dir: 'apps/web/.next/static',
    gzip: true,
  },
  {
    name: 'Web Server',
    dir: 'apps/web/.next/server',
    gzip: false,
  },
  {
    name: 'Web Standalone',
    dir: 'apps/web/.next/standalone',
    gzip: false,
    optional: true,
  },
  {
    name: 'Tracker',
    dir: 'apps/tracker/dist',
    gzip: true,
  },
];

function formatBytes(bytes) {
  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

  const value = bytes / 1024 ** index;

  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function getFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...getFiles(fullPath));
      continue;
    }

    const stat = fs.statSync(fullPath);

    files.push({
      path: fullPath,
      size: stat.size,
    });
  }

  return files;
}

function getGzipSize(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (!['.js', '.css', '.json', '.html'].includes(extension)) {
    return null;
  }

  try {
    return gzipSync(fs.readFileSync(filePath)).length;
  } catch {
    return null;
  }
}

function printTarget(target) {
  const absoluteDirectory = path.join(ROOT, target.dir);

  if (!fs.existsSync(absoluteDirectory)) {
    if (!target.optional) {
      console.log(`\n${target.name}`);
      console.log(`  Missing    : ${target.dir}`);
    }

    return;
  }

  const files = getFiles(absoluteDirectory);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  console.log(`\n${target.name}`);
  console.log(`  Directory  : ${target.dir}`);
  console.log(`  Files      : ${files.length}`);
  console.log(`  Raw size   : ${formatBytes(totalSize)}`);

  if (target.gzip) {
    const gzipSize = files.reduce((sum, file) => {
      const compressedSize = getGzipSize(file.path);

      return sum + (compressedSize ?? 0);
    }, 0);

    console.log(`  Gzip size  : ${formatBytes(gzipSize)}`);
  }

  console.log('');
  console.log('  Largest files:');

  const largestFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 10);

  for (const file of largestFiles) {
    const relativePath = path.relative(ROOT, file.path);
    const rawSize = formatBytes(file.size).padStart(10);

    let output = `  ${rawSize}  ${relativePath}`;

    if (target.gzip) {
      const compressedSize = getGzipSize(file.path);

      if (compressedSize !== null) {
        output += `  | gzip ${formatBytes(compressedSize)}`;
      }
    }

    console.log(output);
  }
}

console.log('');
console.log('==============================================================');
console.log('                    BUILD SIZE REPORT');
console.log('==============================================================');

for (const target of targets) {
  printTarget(target);
}

console.log('');
console.log('==============================================================');
console.log('                  SIZE REPORT COMPLETE');
console.log('==============================================================');
console.log('');
