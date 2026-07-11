#!/usr/bin/env bash
# =====================================================================
# Conventional Commits Lint (헌법 §C-23)
# 사장님 Platform Owner 확립 (2026-07-11):
# Commit Message 규칙 — feat, fix, refactor, test, docs, chore, perf, style, revert
# =====================================================================

set -euo pipefail

ROOT_DIR="$(cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd)"
cd "$ROOT_DIR"

# 검사 범위: 가장 최근 N개 또는 origin/main..HEAD
RANGE="${1:-HEAD~10..HEAD}"

VALID_TYPES="feat|fix|refactor|test|docs|chore|perf|style|revert"

echo "=================================================="
echo "  Conventional Commits Lint (헌법 §C-23)"
echo "=================================================="
echo ""
echo "Range: $RANGE"
echo ""

INVALID_COUNT=0
VALID_COUNT=0

# git log에서 subject만 추출
while IFS= read -r commit_line; do
  full_hash=$(echo "$commit_line" | awk '{print $1}')
  subject=$(git log -1 --format='%s' "$full_hash")

  # Conventional Commits 형식 검사: <type>(<scope>): <subject>
  if [[ "$subject" =~ ^($VALID_TYPES)\([a-z0-9_-]+\): ]]; then
    VALID_COUNT=$((VALID_COUNT + 1))
    echo "  ✅ $subject"
  else
    # type만 있는 경우도 OK (scope 없이 feat: subject)
    if [[ "$subject" =~ ^($VALID_TYPES): ]]; then
      VALID_COUNT=$((VALID_COUNT + 1))
      echo "  ✅ $subject"
    else
      INVALID_COUNT=$((INVALID_COUNT + 1))
      echo "  ❌ $subject"
      echo "     Expected: <type>(<scope>): <subject>"
      echo "     Example: feat(identity): add email login use case"
    fi
  fi
done < <(git log --format='%H' "$RANGE" 2>/dev/null)

echo ""
echo "=================================================="
if [ $INVALID_COUNT -eq 0 ]; then
  echo "  ✅ Commit Lint PASS ($VALID_COUNT valid)"
  echo "=================================================="
  exit 0
else
  echo "  ❌ Commit Lint FAIL ($INVALID_COUNT invalid, $VALID_COUNT valid)"
  echo "=================================================="
  exit 1
fi
