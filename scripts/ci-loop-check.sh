#!/bin/bash
# CI loop check: inner loop + tests
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo "Running inner loop checks..."
"$SCRIPT_DIR/inner-loop-check.sh"

echo "Running tests..."
bun test

echo "CI checks passed."
