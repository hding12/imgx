#!/usr/bin/env bash
set -euo pipefail

source_path="${BASH_SOURCE[0]}"
while [[ -L "${source_path}" ]]; do
  link_dir="$(cd "$(dirname "${source_path}")" && pwd -P)"
  source_path="$(readlink "${source_path}")"
  if [[ "${source_path}" != /* ]]; then
    source_path="${link_dir}/${source_path}"
  fi
done

script_dir="$(cd "$(dirname "${source_path}")" && pwd -P)"
skill_root="$(cd "${script_dir}/.." && pwd)"
repo_root="$(cd "${skill_root}/../.." && pwd)"

declare -a candidates=()

if [[ -n "${IMGX_BIN:-}" ]]; then
  candidates+=("${IMGX_BIN}")
fi

if [[ -f "${repo_root}/dist/cli.js" ]]; then
  candidates+=("${repo_root}/dist/cli.js")
fi

if [[ -x "${repo_root}/node_modules/.bin/imgx" ]]; then
  candidates+=("${repo_root}/node_modules/.bin/imgx")
fi

if command -v imgx >/dev/null 2>&1; then
  candidates+=("$(command -v imgx)")
fi

if [[ "${#candidates[@]}" -eq 0 ]]; then
  cat >&2 <<'EOF'
imgx-bridge: could not locate the imgx CLI.

Resolution order:
1. IMGX_BIN environment variable
2. Local imgx repository build in dist/cli.js
3. Local imgx repository npm binary
4. imgx on PATH

Build the local repository with `npm run build`, install `imgx` globally, or set IMGX_BIN.
EOF
  exit 127
fi

target="${candidates[0]}"

if [[ "${target}" == *.js ]]; then
  if ! command -v node >/dev/null 2>&1; then
    echo "imgx-bridge: node is required to execute ${target}" >&2
    exit 127
  fi
  exec node "${target}" "$@"
fi

exec "${target}" "$@"
