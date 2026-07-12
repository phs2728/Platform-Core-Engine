#!/usr/bin/env bash
# ======================================================================
# Industry-Agnostic Verification (모노레포 공통)
# 사장님 확립: 모든 엔진은 산업 도메인 단어를 사용하지 않는다.
# ======================================================================

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
  "industry=\\*" "industry:\\s*\\*" "FORBIDDEN" "violations"
  "사장님 확립" "사장님 헌법" "TBD" "\\[TBD"
  "NOT an application" "NOT a demo" "NOT an MVP" "NOT an application"
  "이 문서는" "이 문서에" "Not Allowed" "허용하지"
  "PRD §" "TRD §" "헌법" "Constitution"
  "NOT " "forbidden" "strict_boundaries" "이 엔진이" "do not implement"
  # Industry-neutral 코드 identifier 매칭 제외 (검색 정렬 등)
  "sortOrder" "sortBy" "displayOrder" "mediaRef" "pricingRef"
  # Production Readiness Audit 등 일상 단어가 Product/Order/Reservation substring 매칭되는 경우 제외
  "Production" "Readiness" "Audit"
  # Platform Validation Engine: engine IDs and action names are legitimate Platform vocabulary
  "engines/platform-validation"
)

EXCLUDE_REGEX=$(IFS='|'; echo "${EXCLUDE_PATTERNS[*]}")

# 필터: strict_boundaries.forbidden JSON array 내부 라인은 제외 (사장님 Platform Owner 확립, SDK Stability Rule §C-20)
# rg/grep 출력은 "path:linenum:content" 형태 — 첫 ":"만 분리하여 content만 검사
filter_strict_boundaries_forbidden() {
  awk '
    BEGIN { state=0 }
    {
      line=$0
      idx = index(line, ":")
      path = substr(line, 1, idx - 1)
      rest = substr(line, idx + 1)
      idx2 = index(rest, ":")
      linenum = substr(rest, 1, idx2 - 1)
      content = substr(rest, idx2 + 1)

      if (content ~ /"strict_boundaries"[[:space:]]*:[[:space:]]*\{/) { state=1; next }
      if (state==1 && content ~ /"forbidden"[[:space:]]*:[[:space:]]*\[/) { state=2; next }
      if (state==2) {
        if (content ~ /^[[:space:]]*"[A-Za-z][A-Za-z0-9 _]*"[[:space:]]*,$/) next
        if (content ~ /^[[:space:]]*"[A-Za-z][A-Za-z0-9 _]*"[[:space:]]*\]/) { state=0; next }
        if (content ~ /^[[:space:]]*\]/) { state=0; next }
        if (content ~ /^[[:space:]]*}[[:space:]]*,?$/) { state=0; next }
        if (content ~ /^[[:space:]]*"strict_boundaries"/) next
      }
      if (state==1 && content ~ /^[[:space:]]*}[[:space:]]*,?$/) { state=0; next }
      print line
    }
  '
}

echo "================================================="
echo "  Industry-Agnostic Verification (모노레포 공통)"
echo "================================================="
echo ""
echo "검사 대상: engines/, packages/, tools/, docs/, db/"
echo "금지 단어: ${#FORBIDDEN_WORDS[@]}개"
echo ""

VIOLATIONS=0
matches=""
filtered=""

for word in "${FORBIDDEN_WORDS[@]}"; do
  if command -v rg >/dev/null 2>&1; then
    matches=$(rg -i -n --color=never --glob "!verify-industry-agnostic.sh" --glob "!node_modules" --glob "!dist" --glob "!coverage" "${word}" engines/ packages/ tools/ docs/ db/ 2>/dev/null || true)
  else
    matches=$(grep -ri -n --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=coverage "${word}" engines/ packages/ tools/ docs/ db/ 2>/dev/null || true)
  fi

  if [ -z "$matches" ]; then continue; fi

  filtered=$(echo "$matches" | grep -v -E "${EXCLUDE_REGEX}" || true)
  if [ -n "$filtered" ]; then
    filtered=$(echo "$filtered" | filter_strict_boundaries_forbidden || true)
  fi
  if [ -n "$filtered" ]; then
    echo "❌ 금지 단어 발견: '${word}'"
    echo "$filtered"
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

echo "================================================="
if [ $VIOLATIONS -eq 0 ]; then
  echo "  ✅ Industry-Agnostic 검증 통과"
  echo "================================================="
  exit 0
else
  echo "  ❌ Industry-Agnostic 검증 실패 ($VIOLATIONS개 위반)"
  echo "================================================="
  exit 1
fi
