# Hidden Platform Charter (PCR-003)

**Version**: 1.0
**Adopted**: 2026-07-15
**Authority**: Platform Council Resolution PCR-003
**Status**: 🔒 SEALED — Verbatim from PCR-003 Council Decision. Modifications require a new Platform Council Resolution.
**Relationship to Constitution**: This Charter supplements `docs/000_PLATFORM_CONSTITUTION.md` (v1.1 FROZEN + ADR-001 amendments). It does NOT amend the Constitution; it adds the Hidden Platform Principle as a Section in a future amendment (§18 to be added).
**Effective Date**: 2026-07-15
**Owner**: Platform Agency (사장님 박흥식 / Tim Park, operating as Platform Agency under PCR-003)

---

## 0. Provenance of this Charter

This Charter is captured **verbatim** from the Council Chair's resolution text published in the session conversation log on 2026-07-15 under PCR-003. The text in §1 below is **the canonical Charter**. References to it from other documents must include the section heading or verbatim quote.

---

## 1. Charter Text (canonical, verbatim)

```
Hidden Platform Principle

"플랫폼은 보이지 않는다. 고객의 결과물만 보인다."

지금까지 만든 엔진, 스킬, 플레이북은 모두 내부 구현입니다.

이제부터는 고객이 의뢰하면 플랫폼이 내부적으로 모든 것을 활용해서
$10,000 이상의 가치를 가진 결과물을 만들어내는 단계입니다.

고객은 엔진을 몰라도 됩니다.

그 이상도 아닙니다.
```

---

## 2. The Hidden Platform Principle (canonical text restated)

> **"플랫폼은 보이지 않는다. 고객의 결과물만 보인다."**

Operationally this means:

| Layer | Visible to client? | Examples |
|---|---|---|
| Client-Facing artifacts | ✅ YES | Brief, Design Comps, Discovery Conversation, Final Website, Admin Tools |
| Platform-Internal artifacts | ❌ NO | PRD, TRD, Engines, Standards, Playbooks, QES, Agency OS, EPS, ADR |

The Platform Agency performs all internal work — Discovery → PRD → TRD → UX → Frontend → Backend → CMS → SEO → QA → QES → Release — **automatically**, without exposing those steps to the client.

---

## 3. Client sees only (verbatim from 사장님 memory + Brand DNA)

Per Brand DNA / Trust Evidence / Customer Decision Architecture:

| What the client sees | Why it matters |
|---|---|
| Beautiful design | Premium agency-grade visual (Kinfolk/Aman tier) |
| Fast load | Performance budget = Lighthouse ≥ 85, TTFB < 250ms |
| Reservations that work | Booking engine producing confirmed bookings |
| Easy CMS | Manager / staff can update rooms, prices, photos, FAQ |
| AI chatbot | Customer-facing AI assistant for common questions |
| SEO | Schema.org, sitemap, meta tags, multi-language |
| Admin pages | Operational visibility for hostel staff |
| Mobile experience | First-class mobile UX (PWA-ready) |

The client **does not see** any of: ENG-001 / ENG-002 / etc., Modules, Skill IDs, Playbook IDs, QES Gate IDs, ADR numbers, EPS levels, PVC reviews.

---

## 4. Client Agency workflow (re-stated from PCR-003 verbatim)

```
Customer Discovery
  ↓
Requirements Analysis
  ↓
PRD
  ↓
TRD
  ↓
UX Research
  ↓
Information Architecture
  ↓
Content Strategy
  ↓
Trust Architecture
  ↓
Customer Decision Architecture
  ↓
Visual Design
  ↓
Frontend Development
  ↓
Backend Development
  ↓
CMS Configuration
  ↓
SEO
  ↓
Accessibility
  ↓
Performance Optimization
  ↓
QA
  ↓
QES Review
  ↓
Final Delivery
```

The Platform Agency performs this end-to-end automatically. The client sees only the **outputs** at each step that matter to them, not the methodologies.

---

## 5. The "Client" persona (substantive shift)

In Platform Mode (PCR-002 era), the "PVP-001 hypotheses" were the unit of truth. In Client Project Mode (PCR-003 era), **the client is the new unit of truth**:

| Question | Platform Mode answer | Client Project Mode answer |
|---|---|---|
| Who is the "user"? | Hypothesis-tester | The client (e.g., Envoy Hostel & Tours) |
| What does "evidence" mean? | Validated hypothesis | Client satisfaction + delivered value |
| What is "success"? | Hypothesis Verified | Client happy + US$10K+ value delivered |
| What does the AI "look like" to user? | An agent running Playbook | An Agency team delivering a website |

The Platform **transforms from a thesis-tester into an Agency**.

---

## 6. Customer-centric reframe (verbatim from Council Chair)

```
지금까지는 Platform 중심으로 생각했습니다.

하지만 실제 사업에서는 고객 중심이어야 합니다.

즉 여러분의 플랫폼은 보이지 않는 운영체제입니다.

고객이 보는 것은 오직

* 아름다운 디자인
* 빠른 속도
* 예약이 잘 되는 구조
* 관리하기 쉬운 CMS
* AI 챗봇
* SEO
* 관리자 페이지
* 모바일 경험

뿐입니다.
```

---

## 7. Operational guarantees

This Charter binds:

1. **No platform terminology in client deliverables.** Internal docs use PRD, TRD, etc. Client-facing docs never do.
2. **All client artifacts include internal cross-references** (for AI agents / future Platform contributors to find) — but the references themselves are **hidden metadata**.
3. **The client's voice is the truth.** When the client says "X matters", X matters. When the client says "I don't know, you decide", the Platform applies its internal evidence (per Knowledge Governance) to choose.
4. **Internal evidence (hypotheses, EPS ladder, ADR history) is kept for Platform evolution** but never broadcast to the client.

---

## 8. Anti-pattern prohibitions

| Anti-pattern | Why forbidden |
|---|---|
| Showing the client the PRD/TRD | Breaks Hidden Platform Principle |
| Asking the client to "approve Engines" | Client does not know Engines exist |
| Calling a Playbook by name in client chat | Breaks the illusion of agency-only delivery |
| Selling "Platform access" to the client | Client buys a website, not a Platform |

---

## 9. Cross-references

| Related artifact | Path | Status |
|---|---|---|
| Platform Constitution v1.1 + ADR-001 | `docs/000_PLATFORM_CONSTITUTION.md` | frozen |
| ADR-001 | `docs/ADR/ADR-001-platform-freeze-rule.md` | adopted |
| PCR-003 | `.platform-governance/resolutions/PCR-003.md` | adopted |
| Experience Engine Charter | `.charters/EXPERIENCE_ENGINE_CHARTER.md` | sealed |
| Brand DNA Report | `/opt/data/Brand_DNA_Report.md` | inherited |
| Customer Decision Architecture | `/opt/data/Customer_Decision_Architecture.md` | inherited |
| Trust Evidence Blueprint | `/opt/data/Trust_Evidence_Blueprint.md` | inherited |

---

## 10. Seal

```
SEALED 2026-07-15.
PCR-003 ADOPTED UNANIMOUSLY.
Charter §1 is VERBATIM and is the only binding text.
The Hidden Platform Principle is now part of the Platform Agency's charter.
"플랫폼은 보이지 않는다. 고객의 결과물만 보인다."
```
