#!/usr/bin/env bash
# =====================================================================
# Industry-Agnostic Verification (모노레포 공통)
# 사장님 확립: 모든 엔진은 산업 도메인 단어를 사용하지 않는다.
# =====================================================================

set -euo pipefail

ROOT_DIR="$(cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd)"
cd "$ROOT_DIR"

# PRD §2.1 절대 금지 단어 + 추가 금지 단어 (사장님 확립)
FORBIDDEN_WORDS=(
  # PRD §2.1 — 사장님 확립
  "tour" "booking" "hotel" "restaurant" "order" "product" "payment" "passport"
  "travel_history"
  # 추가 (사장님 확립)
  "cafe" "rentcar" "visa" "flight" "itinerary" "reservation"
  "guest_house" "airbnb" "hostel" "luggage"
  "check_in" "check_out" "occupancy" "room_rate"
  "table_reservation" "menu_item" "checkout" "cart"
  "invoice" "billing_address" "shipping_address"
)

# 메타 컨텍스트 (제외 패턴)
EXCLUDE_PATTERNS=(
  "Industry-Agnostic" "industry-agnostic" "IndustryAgnostic"
  "industry=\*" "industry:\s*\*" "FORBIDDEN" "violations"
  "사장님 확립" "사장님 헌법" "TBD" "\[TBD"
  "NOT an application" "NOT a demo" "NOT an MVP" "NOT an application"
  "이 문서는" "이 문서에" "Not Allowed" "허용하지"
  "PRD §" "TRD §" "헌법" "Constitution"
)

EXCLUDE_REGEX=$(IFS='|'; echo "${EXCLUDE_PATTERNS[*]}")

echo "=================================================="
echo "  Industry-Agnostic Verification (모노레포 공통)"
echo "=================================================="
echo ""
echo "검사 대상: engines/, packages/, tools/, docs/, db/"
echo "금지 단어: ${#FORBIDDEN_WORDS[@]}개"
echo ""

VIOLATIONS=0

for word in "${FORBIDDEN_WORDS[@]}"; do
  if command -v rg >/dev/null 2>&1; then
    matches=$(rg -i -n --color=never --glob '!verify-industry-agnostic.sh' --glob '!node_modules' --glob '!dist' --glob '!coverage' "${word}" engines/ packages/ tools/ docs/ db/ 2>/dev/null || true)
  else
    matches=$(grep -ri -n --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=coverage "${word}" engines/ packages/ tools/ docs/ db/ 2>/dev/null || true)
  fi

  if [ -z "$matches" ]; then continue; fi

  filtered=$(echo "$matches" | grep -v -E "${EXCLUDE_REGEX}" || true)
  if [ -n "$filtered" ]; then
    echo "❌ 금지 단어 발견: '${word}'"
    echo "$filtered"
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

echo "=================================================="
if [ $VIOLATIONS -eq 0 ]; then
  echo "  ✅ Industry-Agnostic 검증 통과"
  echo "=================================================="
  exit 0
else
  echo "  ❌ Industry-Agnostic 검증 실패 ($VIOLATIONS개 위반)"
  echo "=================================================="
  exit 1
fi
