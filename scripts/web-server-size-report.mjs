import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const serverDir = path.join(root, 'apps/web/.next/server');

function getFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const result = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...getFiles(fullPath));
    } else {
      result.push({
        path: fullPath,
        size: fs.statSync(fullPath).size,
      });
    }
  }

  return result;
}

function format(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

const files = getFiles(serverDir);

const runtimeJs = files.filter(
  (file) =>
    file.path.endsWith('.js') &&
    !file.path.endsWith('.js.map'),
);

const sourceMaps = files.filter((file) =>
  file.path.endsWith('.map'),
);

const json = files.filter((file) =>
  file.path.endsWith('.json'),
);

const other = files.filter(
  (file) =>
    !file.path.endsWith('.js') &&
    !file.path.endsWith('.map') &&
    !file.path.endsWith('.json'),
);

function total(list) {
  return list.reduce((sum, file) => sum + file.size, 0);
}

console.log('');
console.log('========================================');
console.log('       NEXT WEB SERVER SIZE REPORT');
console.log('========================================');
console.log(`Total server output : ${format(total(files))}`);
console.log(`Runtime JS          : ${format(total(runtimeJs))}`);
console.log(`Source maps         : ${format(total(sourceMaps))}`);
console.log(`JSON/metadata       : ${format(total(json))}`);
console.log(`Other               : ${format(total(other))}`);

console.log('');
console.log('Largest runtime JS files:');

runtimeJs
  .sort((a, b) => b.size - a.size)
  .slice(0, 15)
  .forEach((file) => {
    console.log(
      `${format(file.size).padStart(10)}  ${path.relative(root, file.path)}`,
    );
  });

console.log('');
