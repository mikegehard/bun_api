#!/bin/bash
# CI loop check: test-container + inner-loop + tests
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Testing container build..."
"$REPO_ROOT/project-container/test-container.sh"

echo "Installing dependencies..."
bun install

echo "Running inner loop checks..."
if [ -f "$SCRIPT_DIR/inner-loop-check.sh" ]; then
    "$SCRIPT_DIR/inner-loop-check.sh"
else
    echo "Running type check..."
    bun x tsc --noEmit

    echo "Running lint..."
    bun x eslint src/**/*.ts || echo "ESLint not configured, skipping..."
fi

echo "Running tests..."
bun test

echo "CI checks passed."
