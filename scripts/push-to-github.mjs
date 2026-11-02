import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const REPO_OWNER = 'santy8151';
const REPO_NAME = 'actividad-4-arquitectura';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

if (!TOKEN) {
  console.error('❌ Falta GITHUB_TOKEN. Ejecuta: GITHUB_TOKEN=tu_token node scripts/push-to-github.mjs');
  process.exit(1);
}

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.vercel',
  'bin',
  'obj',
  '__pycache__',
]);

function walkFiles(dir, baseDir = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

async function ghApi(endpoint, method = 'GET', body = undefined) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${method} ${endpoint} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function main() {
  console.log(`🚀 Conectando con ${REPO_OWNER}/${REPO_NAME} (rama: ${BRANCH})...`);
  const refData = await ghApi(`/git/ref/heads/${BRANCH}`);
  const latestCommitSha = refData.object.sha;
  const commitData = await ghApi(`/git/commits/${latestCommitSha}`);
  const baseTreeSha = commitData.tree.sha;

  const files = walkFiles(rootDir);
  console.log(`📦 Subiendo ${files.length} archivos del proyecto RutaClara...`);

  const treeItems = [];
  for (const file of files) {
    const contentBuffer = fs.readFileSync(file.fullPath);
    const base64Content = contentBuffer.toString('base64');
    const blob = await ghApi('/git/blobs', 'POST', {
      content: base64Content,
      encoding: 'base64',
    });
    treeItems.push({
      path: file.relPath,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
  }

  // Elimina del repo remoto los archivos que ya no existen localmente (solo rutas gestionadas por este proyecto)
  const managedRoots = ['api/', 'core/', 'db/', 'src/', 'netlify/', 'scripts/', 'tests/', 'wiki/'];
  const managedFiles = new Set(['netlify.toml']);
  const localPaths = new Set(treeItems.map((t) => t.path));
  const remoteTree = await ghApi(`/git/trees/${baseTreeSha}?recursive=1`);
  for (const node of remoteTree.tree) {
    if (node.type !== 'blob' || localPaths.has(node.path)) continue;
    if (managedFiles.has(node.path) || managedRoots.some((r) => node.path.startsWith(r))) {
      treeItems.push({ path: node.path, mode: '100644', type: 'blob', sha: null });
    }
  }

  const newTree = await ghApi('/git/trees', 'POST', {
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  const commitMessage = process.env.COMMIT_MSG ||
    'feat: complete RutaClara CRM/ERP & Last-Mile Control Tower with Clean Architecture, Leaflet map, RBAC login, and Vercel serverless API';

  const newCommit = await ghApi('/git/commits', 'POST', {
    message: commitMessage,
    tree: newTree.sha,
    parents: [latestCommitSha],
  });

  await ghApi(`/git/refs/heads/${BRANCH}`, 'PATCH', {
    sha: newCommit.sha,
    force: false,
  });

  console.log(`✅ Commit publicado exitosamente en ${REPO_OWNER}/${REPO_NAME}@${BRANCH}: ${newCommit.sha}`);
  console.log(`🌐 Esto dispara automáticamente el despliegue en Vercel.`);
}

main().catch((err) => {
  console.error('❌ Error al publicar:', err.message);
  process.exit(1);
});
