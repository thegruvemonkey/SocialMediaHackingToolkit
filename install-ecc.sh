#!/usr/bin/env bash
# ECC installer for Claude Code — plugin via settings.json + manual rules copy.
set -euo pipefail

# --- config -----------------------------------------------------------------
RULE_PACKS=(common python typescript)   # edit: common, typescript, python, golang, swift, php, arkts
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS="$CLAUDE_DIR/settings.json"
REPO="https://github.com/affaan-m/ECC.git"
TMP=""

cleanup() { [[ -n "$TMP" && -d "$TMP" ]] && rm -rf "$TMP"; }
trap cleanup EXIT

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# --- prereqs ----------------------------------------------------------------
for bin in node git; do
  command -v "$bin" >/dev/null 2>&1 || die "$bin not found on PATH."
done
command -v claude >/dev/null 2>&1 || echo "WARN: 'claude' CLI not on PATH. Config will still be written."

mkdir -p "$CLAUDE_DIR" || die "Cannot create $CLAUDE_DIR"

# --- back up + merge settings.json -----------------------------------------
if [[ -f "$SETTINGS" ]]; then
  BACKUP="$SETTINGS.bak.$(date +%Y%m%d%H%M%S)"
  cp "$SETTINGS" "$BACKUP" || die "Backup failed"
  echo "Backed up existing settings to $BACKUP"
else
  echo '{}' > "$SETTINGS"
fi

node - "$SETTINGS" <<'NODE' || die "settings.json merge failed"
const fs = require('fs');
const p = process.argv[2];
let cfg;
try {
  const raw = fs.readFileSync(p, 'utf8').trim();
  cfg = raw === '' ? {} : JSON.parse(raw);
} catch (e) {
  console.error('Could not parse existing settings.json: ' + e.message);
  process.exit(1);
}
cfg.extraKnownMarketplaces = cfg.extraKnownMarketplaces || {};
cfg.extraKnownMarketplaces.ecc = { source: { source: 'github', repo: 'affaan-m/ECC' } };
cfg.enabledPlugins = cfg.enabledPlugins || {};
cfg.enabledPlugins['ecc@ecc'] = true;
fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + '\n');
console.log('settings.json updated: marketplace "ecc" + plugin "ecc@ecc" enabled.');
NODE

# --- rules (plugins cannot ship these) --------------------------------------
TMP="$(mktemp -d)"
echo "Cloning ECC for rule packs..."
git clone --depth 1 "$REPO" "$TMP/ECC" >/dev/null 2>&1 || die "git clone failed"

mkdir -p "$CLAUDE_DIR/rules/ecc"
for pack in "${RULE_PACKS[@]}"; do
  if [[ -d "$TMP/ECC/rules/$pack" ]]; then
    cp -R "$TMP/ECC/rules/$pack" "$CLAUDE_DIR/rules/ecc/"
    echo "Installed rules: $pack"
  else
    echo "WARN: rule pack '$pack' not found in repo, skipped."
  fi
done

echo
echo "Done. Next:"
echo "  1. Restart Claude Code (or start it: claude)"
echo "  2. Verify:  /plugin list ecc@ecc"
echo "  3. Try:     /ecc:plan \"describe a feature\""
echo
echo "Do NOT also run ./install.sh — that stacks a second install."
