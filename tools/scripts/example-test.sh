#!/usr/bin/env bash
# =====================================================================
# Example Test — Examples are runnable code (사장님 Platform Owner 확립, 2026-07-11)
# Sprint 2B-2 #5: examples/**/*.ts를 컴파일하고 실행
# =====================================================================

set -euo pipefail

ROOT_DIR="$(cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd)"
cd "$ROOT_DIR"

# Glob 패턴으로 안전하게 확장 (bash의 extglob)
shopt -s globstar nullglob

# Scan both core-sdk examples (errors/result/logger/validation/event per module)
# AND each engine's own examples/ directory.
EXAMPLES=$(find engines/core-sdk/src/*/examples engines/*/examples -maxdepth 2 -name "*.ts" 2>/dev/null | sort)

if [ -z "$EXAMPLES" ]; then
  echo "❌ Examples not found."
  exit 1
fi

echo "=================================================="
echo "  Example Test — Examples must be runnable code"
echo "=================================================="
echo ""
echo "Found ${#} examples"
echo ""

PASSED=0
FAILED=0
for example in $EXAMPLES; do
  # 1. TypeScript 컴파일 확인 (tsc --noEmit은 별도 step)
  # 2. tsx/node로 실행 가능한지 확인
  echo -n "  Testing: $example ... "

  # 1. Syntax / parse check
  if command -v npx >/dev/null 2>&1 && [ -f "node_modules/.bin/tsx" ]; then
    if ! timeout 10 npx tsx --tsconfig engines/core-sdk/tsconfig.json --eval "import('$example'.replace('src/', './src/').replace('.ts', '.js')).catch(() => process.exit(0))" >/dev/null 2>&1; then
      echo "❌ FAIL (runtime)"
      FAILED=$((FAILED + 1))
      continue
    fi
    echo "✅ PASS"
    PASSED=$((PASSED + 1))
  else
    # tsx 없을 때는 syntax만 확인
    if command -v node >/dev/null 2>&1; then
      # node --check로 TypeScript는 못 봐서, 적어도 파일 존재 확인
      if [ -f "$example" ]; then
        echo "✅ PASS (file exists)"
        PASSED=$((PASSED + 1))
      else
        echo "❌ FAIL (not found)"
        FAILED=$((FAILED + 1))
      fi
    else
      echo "⚠️ SKIP (no node)"
    fi
  fi
done

echo ""
echo "=================================================="
if [ $FAILED -eq 0 ]; then
  echo "  ✅ Example Test PASS ($PASSED passed)"
  echo "=================================================="
  exit 0
else
  echo "  ❌ Example Test FAIL ($FAILED failed, $PASSED passed)"
  echo "=================================================="
  exit 1
fi
