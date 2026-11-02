#!/usr/bin/env bash
set -e
export PATH="/home/santi/.local/bin:$PATH"
cd /home/santi/.gemini/antigravity/scratch/rutaclara

if ! gh auth status >/dev/null 2>&1; then
  echo "🔐 Iniciando sesión en GitHub..."
  gh auth login --hostname github.com --git-protocol https --web -s repo,workflow
fi

echo "🚀 Subiendo proyecto RutaClara + LastMile a santy8151/actividad-4-arquitectura..."
GITHUB_TOKEN=$(gh auth token) node scripts/push-to-github.mjs
