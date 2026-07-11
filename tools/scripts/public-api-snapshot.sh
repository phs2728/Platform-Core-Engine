#!/usr/bin/env bash
# =====================================================================
# Public API Snapshot (헌법 §C-20 SDK Stability Rule 자동 검증)
# 사장님 Platform Owner 확립 (2026-07-11):
# "Core SDK에서 export * 되는 API를 Snapshot으로 저장하세요.
#  Sprint마다 비교합니다. Logger, Result, PlatformError가 갑자기 없어지면 CI가 FAIL."
# =====================================================================

set -euo pipefail

ROOT_DIR="$(cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd)"
cd "$ROOT_DIR"

SNAPSHOT_DIR="engines/core-sdk/.snapshot"
SNAPSHOT_FILE="$SNAPSHOT_DIR/public-api.snapshot"

mkdir -p "$SNAPSHOT_DIR"

# 모든 export 라인 추출 (간단한 regex)
# @platform/core-sdk/src/*.ts 에서 `export ...` 라인만 캡처
EXPORTS=$(rg -n --no-heading "^\s*export\s+(const|class|function|interface|type|enum|abstract|declare|default|namespace|\{|\*)" engines/core-sdk/src/ 2>/dev/null | sort || true)

if [ -z "$EXPORTS" ]; then
  echo "❌ export를 찾을 수 없습니다. src/ 디렉토리를 확인하세요."
  exit 1
fi

# 임시 파일에 저장
TMPFILE="$SNAPSHOT_DIR/.current"
echo "# Public API Snapshot" > "$TMPFILE"
echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" >> "$TMPFILE"
echo "# DO NOT EDIT MANUALLY — run 'pnpm public-api-snapshot --update'" >> "$TMPFILE"
echo "" >> "$TMPFILE"
echo "$EXPORTS" >> "$TMPFILE"

if [ ! -f "$SNAPSHOT_FILE" ]; then
  # 첫 실행 — Snapshot 생성
  cp "$TMPFILE" "$SNAPSHOT_FILE"
  echo "=================================================="
  echo "  Public API Snapshot — Initial Generation"
  echo "=================================================="
  echo ""
  echo "Snapshot created: $SNAPSHOT_FILE"
  echo ""
  exit 0
fi

# 비교
if diff -q "$TMPFILE" "$SNAPSHOT_FILE" >/dev/null 2>&1; then
  echo "=================================================="
  echo "  Public API Snapshot — PASS"
  echo "=================================================="
  echo ""
  echo "✅ Public API 동일 (변경 없음)"
  echo ""
  rm -f "$TMPFILE"
  exit 0
else
  # 업그레이드 모드
  if [ "${1:-}" == "--update" ]; then
    cp "$TMPFILE" "$SNAPSHOT_FILE"
    echo "=================================================="
    echo "  Public API Snapshot — UPDATED"
    echo "=================================================="
    echo ""
    echo "Snapshot updated: $SNAPSHOT_FILE"
    echo ""
    rm -f "$TMPFILE"
    exit 0
  fi

  echo "=================================================="
  echo "  Public API Snapshot — FAIL"
  echo "=================================================="
  echo ""
  echo "❌ Public API 변경 감지 (헌법 §C-20 위반 가능)"
  echo ""
  echo "Diff:"
  diff "$SNAPSHOT_FILE" "$TMPFILE" || true
  echo ""
  echo "→ 업데이트하려면: 'pnpm public-api-snapshot --update'"
  echo "→ Major Version + ADR 필요"
  echo ""
  rm -f "$TMPFILE"
  exit 1
fi
