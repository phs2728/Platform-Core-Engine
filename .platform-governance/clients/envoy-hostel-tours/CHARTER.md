---
project_id: PVP-001
internal_id: PVP-001 (re-designated; previously Product Lab 001)
client_name: "Envoy Hostel & Tours"
project_type: Website Remodel
target_value: US$10,000+
mode: Client Project Mode (per PCR-003 + ADR-002 + Constitution §18)
pre_coding_plan_status: pvc-approved (sign-off 2026-07-15)
filed: 2026-07-15
authority: PCR-003 §"FIRST PRODUCT"
---

# Client Project CHARTER — Envoy Hostel & Tours (PVP-001 / Client Project 001)

> **Status**: 🟢 STARTED — Pre-Coding Plan `pvc-approved`. Platform Agency auto-execution begins.
> **Customer**: 사장님 박흥식 / Tim Park (acting in dual capacity: Platform Owner + Envoy Hostel project principal).
> **Mission**: Deliver a production-ready, premium agency-grade website. Target value US$10,000+.

---

## 1. Project identity

| Field | Value |
|---|---|
| Project ID (internal) | **PVP-001** (same identifier; traceability preserved) |
| Project role (new) | **Client Project 001** (canonical first Client Project per PCR-003) |
| Previous role | Product Lab 001 (per PCR-002; superseded) |
| Client name | **Envoy Hostel & Tours** |
| Project type | Website Remodel |
| Project value (target) | **US$10,000+** premium agency-grade |
| Customer | 사장님 박흥식 / Tim Park |
| Platform version | Core v1.2 Frozen (Constitution v1.2 + ADR-001 + ADR-002 amendments) |
| Mode | Client Project Mode (PCR-003 §"NEW OPERATING MODE") |
| Pre-Coding Plan | `pvc-approved` (sign-off 2026-07-15) |
| Filed | 2026-07-15 |
| Authority chain | Customer → PCR-003 (Council Resolution) → ADR-002 (Constitutional amendment) → Constitution §18 (C-25) → Customer Charter (.charters/CUSTOMER_CHARTER.md) → This Charter |

---

## 2. Mission (verbatim from PCR-003)

```
MISSION

Deliver a production-ready

premium agency-grade website.

Target value

US$10,000+
```

---

## 3. Platform Agency auto-execution (verbatim 16 internal phases from PCR-003)

The Platform Agency auto-executes these 16 internal phases. **The customer does not see them.**

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

These 16 phases are **internal**. They are performed automatically by the Platform Agency using the frozen Platform Core v1.2.

---

## 4. Customer-facing surface (verbatim 8 client-visible outputs from PCR-003 §"The client must never need to understand")

**The customer sees only these 8 outputs:**

1. **Beautiful design** — per 사장님 확립 design 헌장 (Kinfolk/Aman-grade, Pretendard, qvevri-wine).
2. **Fast speed** — Lighthouse mobile ≥ 85; TTFB P95 < 250ms.
3. **Booking-ready structure** — search → detail → booking → confirmation; payment via `payment` engine; A/B-tested CTA.
4. **Easy-to-manage CMS** — content via `cms` engine (page copy, room descriptions, FAQ); no-code editing by hostel staff.
5. **AI chatbot** — simple, brand-tone; reads content + booking state; answers FAQs.
6. **SEO** — Schema.org LodgingBusiness; canonical URLs; metadata; sitemap; Google Search Console verified.
7. **Admin pages** — for staff to manage rooms, prices, reviews, bookings.
8. **Mobile experience** — fully responsive; PWA-ready; iOS Safari + Android Chrome verified.

The customer NEVER needs to understand:

- PRD, TRD
- Agency OS, QES
- Skills, Playbooks
- Platform internals (Engines, Contracts, Events, etc.)

---

## 5. Customer Charter binding

The Customer Charter at `.charters/CUSTOMER_CHARTER.md` is the **operating doctrine** for this Client Project. It is incorporated by reference.

Both the C-25 Constitutional principle (Constitution §18 verbatim: "플랫폼은 보이지 않는다. 고객의 결과물만 보인다.") and the operational declaration (PCR-003 §1 verbatim block, recorded in the Charter §2) bind this Client Project.

---

## 6. Pre-Coding Plan — gate status

| Field | Value |
|---|---|
| Plan path | `.platform-governance/products/pvp-001/pre-coding-plan.md` |
| Status | `pvc-approved` |
| Sign-off date | 2026-07-15 |
| Sign-off authority | 사장님 (PVC Chair by Platform Owner role) |
| Supersession note | Plan was originally filed for Product Lab Mode under PCR-002; same Plan satisfies the Client Project Mode gate (Constitution §17 + Constitution §18) per ADR-002 §Amendment C |
| Hypotheses (still valid) | HYP-PVP-001-001..004 (4 hypotheses; translated into Customer Project success criteria) |
| Experiments | EXP-PVP-001-001..004 (4 experiments; auto-launched by Platform Agency) |
| Plans / deliverables | 19 phase plan documents at `.platform-governance/products/pvp-001/` (reused as internal pipeline artifacts) |

---

## 7. Customer (Envoy Hostel & Tours) requirements — extracted

From the Customer's single sentence (PCR-003 §"CLIENT"):

> "Envoy Hostel & Tours" — Website Remodel.

Implied requirements (discovered by Phase 1 "Customer Discovery"):

- Premium-grade design (Kinfolk/Aman-heritage visual)
- Tbilisi + English + Korean + Georgian language support
- Booking flow with payment + A/B-tested CTA
- Trust evidence cluster (reviews, secure-payment, refundability, manager contact)
- Content-edit capability by hostel staff (CMS)
- SEO-optimized for organic discovery
- Admin page for room/price/booking management
- Mobile-first responsive
- AI chatbot for FAQs (post-MVP iteration per Charter §5)

---

## 8. Delivery tier per output

| # | Output | MVP tier | Iter-1 | Iter-2 |
|---|---|---|---|---|
| 1 | Beautiful design | ✅ MVP | refine | annual refresh |
| 2 | Fast speed | ✅ MVP | edge tuning | — |
| 3 | Booking-ready | ✅ MVP | A/B tests | OTA integration |
| 4 | CMS | ✅ MVP | workflows | multi-language |
| 5 | AI chatbot | ⏸ Iter-1 (1-2 weeks post-launch) | refinement | — |
| 6 | SEO | ✅ MVP | content scaling | — |
| 7 | Admin pages | ✅ MVP | reports | automation |
| 8 | Mobile experience | ✅ MVP | PWA | — |

MVP delivers outputs 1, 2, 3, 4, 6, 7, 8. Output 5 (AI chatbot) is Iter-1 per Charter §5.

---

## 9. Success criteria (Customer-side)

| # | Criterion | Measurement |
|---|---|---|
| S1 | Production-ready website live on real domain | Domain live + DNS verified |
| S2 | Visual quality at premium-level | Lighthouse design score ≥ 90; 사장님 확립 design 헌장 compliance |
| S3 | Booking flow E2E working with payment | Test booking + sandbox payment |
| S4 | CMS accepts content edits without code | Staff editing test |
| S5 | SEO basics present | Schema.org + sitemap + canonical URLs verified |
| S6 | Performance budget met | Lighthouse mobile ≥ 85; TTFB < 250ms |
| S7 | QES gates PASS | QES report signed by Platform Guardian |
| S8 | Customer satisfaction (sa장님 as client) | Final delivery acceptance |

Plus **target value ≥ US$10,000** as the price the platform would charge an external client for equivalent delivery.

---

## 10. Operating layer stack

```
┌──────────────────────────────────────────────────────────────┐
│  Customer-Facing Surface (PCR-003)                          │
│    8 client-visible outputs (this CHARTER §4)               │
├──────────────────────────────────────────────────────────────┤
│  Platform Agency auto-execution (PCR-003)                   │
│    16 internal phases (this CHARTER §3)                      │
├──────────────────────────────────────────────────────────────┤
│  Platform Core v1.2 FROZEN                                  │
│    33 engines + 1 known-exception + C-24 + C-25            │
└──────────────────────────────────────────────────────────────┘
```

---

## 11. C-24 + C-25 explicit compliance

| Rule | Status |
|---|---|
| Do NOT modify Platform Core (C-24) | ✅ Platform Core v1.2 frozen |
| Do NOT create new Engines during Client Project (C-24) | ✅ use only frozen Engines |
| Do NOT create new Standards during Client Project (C-24) | ✅ use only existing Standards |
| Use only existing Platform capabilities (PCR-003) | ✅ use only frozen 33 Engines |
| Platform is invisible (C-25) | ✅ Customer sees 8 outputs only |
| Client sees only the deliverable (C-25) | ✅ Customer never sees PRD/TRD/Agency OS/QES |

---

## 12. Document control

| Revision | Date | Author | Status |
|---|---|---|---|
| 0.1.0 | 2026-07-15 | 사장님 (as Platform Owner + Client) | Adopted |
| next | TBD | Platform Guardian | On QES pass |

---

## 13. Cross-references

| Artifact | Path |
|---|---|
| Customer Charter | `.charters/CUSTOMER_CHARTER.md` |
| PCR-003 | `.platform-governance/resolutions/PCR-003.md` |
| ADR-002 | `docs/ADR/ADR-002-client-project-mode.md` |
| Constitution v1.2 §18 | `docs/000_PLATFORM_CONSTITUTION.md` |
| Pre-Coding Plan (approved) | `.platform-governance/products/pvp-001/pre-coding-plan.md` |
| Product Kickoff (Phase 1–14 context) | `.platform-governance/products/pvp-001/product-kickoff.md` |
| Auto-Execution Pipeline | `.platform-governance/clients/envoy-hostel-tours/auto-execution-pipeline.md` |
| Customer-Facing Delivery Checklist | `.platform-governance/clients/envoy-hostel-tours/delivery-checklist.md` |
| $10k+ Premium Delivery Check | `.platform-governance/clients/envoy-hostel-tours/premium-delivery-check.md` |

---

## 14. Seal

```
CLIENT PROJECT 001 CHARTER ADOPTED 2026-07-15.
PCR-003 + ADR-002 + Constitution §18 (C-25) binding.
Pre-Coding Plan: pvc-approved.
Customer: Envoy Hostel & Tours (Website Remodel; $10k+ target).
Platform Agency auto-execution: 16 internal phases.
Client-visible deliverables: 8 outputs.
C-24 + C-25 explicit compliance confirmed.
Project status: STARTED.
```
