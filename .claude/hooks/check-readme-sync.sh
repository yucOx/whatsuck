#!/bin/bash
# check-readme-sync.sh
# Called after every file edit. Warns if:
#   1. A new file in src/ is not listed in the README module map
#   2. README.md and README.tr.md sections are out of sync
#   3. package.json version doesn't match the latest git tag

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
cd "$REPO_ROOT"

# 1. Check that every src/*.js file appears in ARCHITECTURE.md
for f in src/*.js; do
  basename="$(basename "$f")"
  if ! grep -q "$basename" ARCHITECTURE.md 2>/dev/null; then
    echo "⚠️  $basename is not listed in ARCHITECTURE.md module map"
  fi
done

# 2. Check that README.md and README.tr.md have the same number of ## headings
en_count=$(grep -c '^## ' README.md 2>/dev/null || echo 0)
tr_count=$(grep -c '^## ' README.tr.md 2>/dev/null || echo 0)
if [ "$en_count" != "$tr_count" ]; then
  echo "⚠️  README.md has $en_count sections but README.tr.md has $tr_count — they may be out of sync"
fi

# 3. Check package.json version vs latest tag
pkg_version=$(node -e "console.log(require('./package.json').version)" 2>/dev/null)
latest_tag=$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//')
if [ -n "$latest_tag" ] && [ "$pkg_version" != "$latest_tag" ]; then
  echo "ℹ️  package.json version ($pkg_version) differs from latest tag (v$latest_tag) — bump before release"
fi

exit 0