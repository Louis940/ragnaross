#!/usr/bin/env bash
# Build the Astro site. Tuned for low-RAM Pis (~1GB): avoids redundant npm work.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="${REPO_ROOT}/site"
LOCK="${SITE_DIR}/package-lock.json"
STAMP="${SITE_DIR}/node_modules/.install-stamp"

cd "${SITE_DIR}"

if ! command -v fnm >/dev/null 2>&1 && [[ -x "${HOME}/.local/share/fnm/fnm" ]]; then
  export PATH="${HOME}/.local/share/fnm:${PATH}"
fi
if command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env)"
  if [[ -f .node-version ]]; then
    fnm use
  else
    fnm use 25.9.0 2>/dev/null || fnm use default
  fi
fi

node -e "
const v = process.versions.node.split('.').map(Number);
const ok = v[0] > 22 || (v[0] === 22 && v[1] >= 12);
if (!ok) {
  console.error('Node ' + process.version + ' is too old for Astro 6 (need >= 22.12).');
  process.exit(1);
}
"

# Cap Node heap so npm/astro are less likely to OOM the whole system.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=384}"

need_install() {
  [[ ! -d node_modules ]] && return 0
  [[ ! -f "${LOCK}" ]] && return 0
  [[ ! -f "${STAMP}" ]] && return 0
  [[ "${LOCK}" -nt "${STAMP}" ]] || [[ package.json -nt "${STAMP}" ]]
}

if [[ ! -f "${LOCK}" ]]; then
  echo "==> Creating package-lock.json (no node_modules yet)…"
  npm install --package-lock-only --prefer-online
fi

if need_install; then
  echo "==> Installing dependencies (npm ci)…"
  sync
  npm ci
  mkdir -p node_modules
  touch "${STAMP}"
else
  echo "==> Dependencies up to date, skipping npm ci"
fi

echo "==> Building static site…"
npm run build

echo "Built → ${SITE_DIR}/dist"
