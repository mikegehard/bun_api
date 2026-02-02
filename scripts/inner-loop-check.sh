#!/bin/bash
# Inner loop check: type check + lint (fast feedback)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo "Installing dependencies..."
bun install

echo "Running type check..."
bun run tsc --noEmit

echo "Running lint..."
bun run eslint src/

echo "Inner loop checks passed."
