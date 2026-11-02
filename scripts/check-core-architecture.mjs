import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function listTsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTsFiles(full));
    } else if (entry.isFile() && /\.(ts|tsx|mts)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function extractImports(content) {
  const regex = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*from\s+)?['"]([^'"]+)['"]/g;
  const imports = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

let violations = 0;

// 1. Verificar que core/domain no dependa de ninguna capa exterior ni librería de infraestructura
const domainFiles = listTsFiles(path.join(rootDir, 'core/domain'));
const forbiddenInDomain = [
  'application',
  'infrastructure',
  'drizzle-orm',
  'react',
  'leaflet',
  '../',
  '@db',
  '@/',
];

for (const file of domainFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const imports = extractImports(content);
  for (const imp of imports) {
    for (const forbidden of forbiddenInDomain) {
      if (imp.includes(forbidden)) {
        console.error(
          `[ARCH VIOLATION] core/domain (${path.relative(rootDir, file)}) importa '${imp}' (prohibido: '${forbidden}')`
        );
        violations++;
      }
    }
  }
}

// 2. Verificar que core/application solo dependa de core/domain (nunca de infrastructure, db, ui ni frameworks)
const appFiles = listTsFiles(path.join(rootDir, 'core/application'));
const forbiddenInApplication = [
  'infrastructure',
  'drizzle-orm',
  'react',
  'leaflet',
  '@db',
  '@/',
  '../../',
];

for (const file of appFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const imports = extractImports(content);
  for (const imp of imports) {
    for (const forbidden of forbiddenInApplication) {
      if (imp.includes(forbidden)) {
        console.error(
          `[ARCH VIOLATION] core/application (${path.relative(rootDir, file)}) importa '${imp}' (prohibido: '${forbidden}')`
        );
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n❌ Se encontraron ${violations} violaciones de arquitectura en RutaClara.`);
  process.exit(1);
}

console.log(`✅ RutaClara Clean Architecture fitness function passed:`);
console.log(`   - core/domain (${domainFiles.length} archivos): 0 dependencias de infraestructura.`);
console.log(`   - core/application (${appFiles.length} archivos): depende únicamente de core/domain.`);
