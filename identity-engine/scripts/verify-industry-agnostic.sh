#!/usr/bin/env bash
# =====================================================================
# Identity Engine — Industry Agnostic Verification
# 사장님 확립: 모든 코드/문서/스키마에서 산업 키워드 0회 등장
# =====================================================================

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "${SCRIPT_DIR}/.." && pwd )"

# ---------------------------------------------------------------------
# 금지 단어 (PRD §2.1 사장님 확립)
# ---------------------------------------------------------------------

# 대소문자 무시 단어 매칭
# 단, 일반 단어 충돌 방지:
#   - "order" 는 SQL ORDER BY 와 충돌하므로 제외 (식별자 검색만)
#   - "product" 는 너무 일반적이라 영어 사전 단어로 제외
#   - "payment" 는 명시적 금융 도메인 단어
# 실제 도메인 단어만 검사:

FORBIDDEN_WORDS=(
  # 명백한 산업 도메인
  "tour"
  "booking"
  "hotel"
  "restaurant"
  "cafe"
  "rentcar"
  "rent_car"
  "rent-car"
  "passport"
  "travel_history"
  "booking_history"
  "order_history"
  "reservation"
  "guest_house"
  "airbnb"
  "hostel"
  "itinerary"
  "visa"
  "flight"
  "luggage"
  "check_in"
  "check_out"
  "occupancy"
  "room_rate"
  "table_reservation"
  "menu_item"
  "checkout"
  "cart"
  "invoice"
  "billing_address"
  "shipping_address"
)

# 화이트리스트 (정당한 사용)
# 예: SQL "ORDER BY"는 허용, "travel" 단어는 금지 목록에 없음
# 위 배열에서 "order"는 빼고 따로 검사하지 않음.

# ---------------------------------------------------------------------
# 검사 대상
# ---------------------------------------------------------------------

SEARCH_PATHS=(
  "${ROOT_DIR}/docs/"
  "${ROOT_DIR}/db/"
  "${ROOT_DIR}/src/"          # (미래) 소스 디렉토리
  "${ROOT_DIR}/test/"         # (미래) 테스트 디렉토리
  "${ROOT_DIR}/examples/"     # (미래) 예시 디렉토리
  "${ROOT_DIR}/README.md"
)

# 검사에서 제외할 파일
EXCLUDE_FILES=(
  "*verify-industry-agnostic*"   # 자기 자신
)

# 검사에서 제외할 라인 패턴 (정당한 사용)
# 사장님 헌법: 메타 컨텍스트(PRD 자체에서 금지 단어를 언급하는 경우)는 허용
EXCLUDE_PATTERNS=(
  "Industry-Agnostic"
  "industry-agnostic"
  "IndustryAgnostic"
  "industry=\*"
  "industry:[[:space:]]*\*"
  "NOT an application"
  "NOT a demo"
  "NOT an MVP"
  "Industry Agnostic 검증"
  "사장님 확립"
  "사장님이 확립"
  "사장님 헌법"
  "사장님 직접"
  "PRD §"
  "PRD §"
  "TRD §"
  "예시"
  "예:"
  "예)"
  "예\)"
  "등장 안 함"
  "나타나지 않음"
  "금지 단어"
  "FORBIDDEN"
  "위반"
  "호환성"
  "사용합니다"
  "사용하기"
  "호스트"
  "consumer"
  "하위 제품"
  "미래 제품"
  "모든 제품"
  "Tour OS"
  "Hospitality OS"
  "Restaurant OS"
  "Cafe OS"
  "RentCar OS"
  "tour-os"
  "hospitality-os"
  "restaurant-os"
  "cafe-os"
  "rentcar-os"
  "actions/checkout"
  "Preflight"
)

# join into regex alternation
EXCLUDE_REGEX=$(IFS='|'; echo "${EXCLUDE_PATTERNS[*]}")

# ---------------------------------------------------------------------
# 실행
# ---------------------------------------------------------------------

cd "${ROOT_DIR}"

echo "=================================================="
echo "  Identity Engine — Industry Agnostic Verification"
echo "=================================================="
echo ""
echo "검사 대상: ${SEARCH_PATHS[@]}"
echo "금지 단어: ${#FORBIDDEN_WORDS[@]}개"
echo ""

VIOLATIONS=0
TOTAL_FILES_CHECKED=0

for word in "${FORBIDDEN_WORDS[@]}"; do
  # rg (ripgrep) 우선, 없으면 grep
  if command -v rg >/dev/null 2>&1; then
    matches=$(rg -i -n --color=never \
      --glob '!verify-industry-agnostic.sh' \
      "${word}" "${SEARCH_PATHS[@]}" 2>/dev/null || true)
  else
    matches=$(grep -ri -n --exclude="verify-industry-agnostic.sh" \
      "${word}" "${SEARCH_PATHS[@]}" 2>/dev/null || true)
  fi

  if [ -z "${matches}" ]; then
    continue
  fi

  # 제외 패턴 적용 (Bash 배열 → 정규식 OR)
  filtered=$(echo "${matches}" | grep -v -E "${EXCLUDE_REGEX}" || true)

  if [ -n "${filtered}" ]; then
    echo "❌ 금지 단어 발견: '${word}'"
    echo "${filtered}"
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

# 추가 검사: 스키마에서 테이블/컬럼명에 금지 단어 사용
echo "--- 스키마 컬럼명 검사 ---"
SCHEMA_VIOLATIONS=0
if [ -f "${ROOT_DIR}/db/schema.sql" ]; then
  for word in "${FORBIDDEN_WORDS[@]}"; do
    # 컬럼명 패턴: word 또는 word_something (snake_case)
    if command -v rg >/dev/null 2>&1; then
      matches=$(rg -i -n --color=never \
        "^\s*[a-z_]*${word}[a-z_]*\s+" \
        "${ROOT_DIR}/db/schema.sql" 2>/dev/null || true)
    else
      matches=$(grep -i -n -E "^\s*[a-z_]*${word}[a-z_]*\s+" \
        "${ROOT_DIR}/db/schema.sql" 2>/dev/null || true)
    fi

    if [ -n "${matches}" ]; then
      echo "⚠️  스키마에 '${word}' 관련 컬럼/테이블 의심:"
      echo "${matches}"
      SCHEMA_VIOLATIONS=$((SCHEMA_VIOLATIONS + 1))
    fi
  done
fi

echo ""
echo "=================================================="
if [ ${VIOLATIONS} -eq 0 ] && [ ${SCHEMA_VIOLATIONS} -eq 0 ]; then
  echo "  ✅ Industry Agnostic 검증 통과"
  echo "=================================================="
  echo ""
  echo "  모든 코드/문서/스키마에서 산업 도메인 단어가 발견되지 않았습니다."
  echo "  Identity Engine은 진정한 Industry-Agnostic Engine입니다."
  exit 0
else
  echo "  ❌ Industry Agnostic 검증 실패"
  echo "=================================================="
  echo ""
  echo "  텍스트 위반: ${VIOLATIONS}개 단어"
  echo "  스키마 위반: ${SCHEMA_VIOLATIONS}개"
  echo ""
  echo "  사장님 확립 (PRD §2.1):"
  echo "  > Identity Engine은 다음 개념을 절대 포함하지 않는다."
  echo "  > Tour, Booking, Hotel, Restaurant, Order, Product, Payment, Passport, Travel History"
  echo ""
  exit 1
fi