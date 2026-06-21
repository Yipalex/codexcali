#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${CODEXCALI_REPO_URL:-https://github.com/Yipalex/codexcali.git}"
PLUGIN_DIR="${CODEXCALI_PLUGIN_DIR:-$HOME/plugins/codexcali}"
MARKETPLACE_PATH="${CODEXCALI_MARKETPLACE_PATH:-$HOME/.agents/plugins/marketplace.json}"
SKIP_CODEX_ADD="${CODEXCALI_SKIP_CODEX_ADD:-0}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command '$1' was not found. Install it and run this script again." >&2
    exit 1
  fi
}

codex_cli_ready() {
  command -v codex >/dev/null 2>&1 && codex --version >/dev/null 2>&1
}

require_command git
require_command npm

mkdir -p "$(dirname "$PLUGIN_DIR")"

if [ -d "$PLUGIN_DIR/.git" ]; then
  echo "Updating existing Codexcali checkout at $PLUGIN_DIR"
  git -C "$PLUGIN_DIR" pull --ff-only
elif [ -e "$PLUGIN_DIR" ]; then
  echo "$PLUGIN_DIR exists but is not a git checkout. Move it aside and run this script again." >&2
  exit 1
else
  echo "Cloning Codexcali into $PLUGIN_DIR"
  git clone "$REPO_URL" "$PLUGIN_DIR"
fi

cd "$PLUGIN_DIR"
npm install
npm run build

mkdir -p "$(dirname "$MARKETPLACE_PATH")"

node - "$MARKETPLACE_PATH" <<'NODE'
const fs = require("node:fs");
const marketplacePath = process.argv[2];
const entry = {
  name: "codexcali",
  source: { source: "local", path: "./plugins/codexcali" },
  policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
  category: "Productivity"
};

let json = {
  name: "personal",
  interface: { displayName: "Personal" },
  plugins: []
};

if (fs.existsSync(marketplacePath)) {
  json = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
  json.name ||= "personal";
  json.interface ||= { displayName: "Personal" };
  json.plugins ||= [];
}

json.plugins = json.plugins.filter((plugin) => plugin.name !== "codexcali");
json.plugins.push(entry);
fs.writeFileSync(marketplacePath, `${JSON.stringify(json, null, 2)}\n`);
NODE

echo "Registered Codexcali in $MARKETPLACE_PATH"

if [ "$SKIP_CODEX_ADD" = "1" ]; then
  echo "Skipped: codex plugin add codexcali@personal"
  exit 0
fi

if ! codex_cli_ready; then
  echo "Codex CLI is not runnable from this terminal. Install or enable the Codex CLI, then run:" >&2
  echo "  codex plugin add codexcali@personal" >&2
  exit 2
fi

codex plugin add codexcali@personal
echo "Codexcali installed. Open a new Codex thread to load the plugin."
