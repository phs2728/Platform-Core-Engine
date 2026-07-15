# Customer-Facing Delivery Checklist — PVP-001

> **Authority**: PCR-003 §"OUTPUT" verbatim (8 client-visible outputs).
> **Status**: 🟢 ACTIVE — this is what the Customer (Envoy Hostel & Tours) sees and judges.
> **C-25 binding**: Internal mechanics (PRD/TRD/Agency OS/QES) are NOT in this checklist. The customer sees only the 8 items.

---

## 1. The 8 client-visible deliverables (verbatim from PCR-003)

### 1.1 Beautiful design
- [ ] 사장님 확립 design 헌장 compliance (Kinfolk/Aman-grade)
- [ ] Pretendard ExtraBold(800) titles; Pretendard 400 body
- [ ] Color palette: caucasus-snow(#faf8f5) / qvevri-wine(#7c2d3a) / forest-stone(#292524)
- [ ] NO serif fonts (Playfair, NotoSerifKR, RIDIBatang)
- [ ] NO AI gradients
- [ ] NO shadow-xl blunt styles
- [ ] NO pure black (#000)
- [ ] Ghost buttons + rounded-xl
- [ ] Fixed video hero permitted (Apple/Nike pattern)
- [ ] Bento Box asymmetric layouts permitted
- [ ] Framer Motion spring sliders permitted
- [ ] text-shadow for hero overlay legibility

### 1.2 Fast speed
- [ ] Lighthouse mobile score ≥ 85
- [ ] TTFB P95 < 250ms (per TRD)
- [ ] LCP < 2.5s on /rooms/[slug]
- [ ] Performance budget enforced via CI

### 1.3 Booking-ready structure
- [ ] Search availability (booking engine)
- [ ] Detail page with hero gallery + pricing
- [ ] Booking flow: step 1 dates → step 2 guests → step 3 payment → step 4 confirmation
- [ ] Payment integration (test mode + sandbox)
- [ ] Cancellation policy prominent
- [ ] Trust evidence cluster on book page (per Hypothesis 004)
- [ ] A/B-tested CTA (4 variants wired per Hypothesis 003)

### 1.4 Easy-to-manage CMS
- [ ] Page copy editable via CMS
- [ ] Room descriptions editable
- [ ] FAQ editable
- [ ] Cancellation policy editable
- [ ] NO code editing required for content updates
- [ ] Edit preview before publish

### 1.5 AI chatbot (Iter-1, post-MVP)
- [ ] Brand-tone aligned (matches 콘텐츠 전략)
- [ ] Reads page content + booking state
- [ ] Answers FAQs
- [ ] NO booking manipulation (read-only assistant)
- [ ] Configurable fallback to manager contact
- [ ] Lazy load on demand
*(planned for Iter-1; not in MVP scope)*

### 1.6 SEO
- [ ] Schema.org LodgingBusiness markup
- [ ] Canonical URLs
- [ ] Meta title + description per page
- [ ] Open Graph + Twitter Card
- [ ] Sitemap.xml
- [ ] Robots.txt
- [ ] Google Search Console verified
- [ ] Bing Webmaster verified

### 1.7 Admin pages
- [ ] Login + 2FA for staff
- [ ] Room management (CRUD)
- [ ] Price management (seasonal)
- [ ] Booking management (view + cancel + refund)
- [ ] Reviews moderation (response capability)
- [ ] Manager contact + response time SLA tracker

### 1.8 Mobile experience
- [ ] Fully responsive (320px → 4K)
- [ ] iOS Safari verified (no rubber-band glitches)
- [ ] Android Chrome verified
- [ ] Tap targets ≥ 44px
- [ ] WCAG 2.1 AA compliant (contrast, focus, alt text)
- [ ] PWA-ready (manifest + service worker — deferred to Iter-2 if not MVP)

---

## 2. Handoff marker per output

| # | Output | Customer reviews | Internal handoff |
|---|---|---|---|
| 1 | Design | 사장님 final sign-off | UI Design → Frontend |
| 2 | Speed | Lighthouse report | Frontend + Backend |
| 3 | Booking | End-to-end test booking | Backend + QA |
| 4 | CMS | Staff edit test (manager or CEO plays staff) | Backend + Marketing |
| 5 | AI chatbot | Brand-tone review | Post-MVP |
| 6 | SEO | Google Search Console screenshot | SEO + Marketing |
| 7 | Admin | Manager / staff scenario walk | Backend + QA |
| 8 | Mobile | iOS + Android device demos | Frontend + QA |

---

## 3. Final Delivery Bundle

When all 8 outputs are complete, the following bundle is delivered to the Customer:

- Production URL (live)
- CMS access (manager + 1 backup)
- Admin account (manager)
- AI chatbot (Iter-1)
- SEO verification report
- Mobile device checklist + screenshots
- Lighthouse report
- QES compliance certificate
- Premium Delivery Check sign-off (see `premium-delivery-check.md`)

---

## 4. Cross-references

| Artifact | Path |
|---|---|
| Charter (Client Project) | `.platform-governance/clients/envoy-hostel-tours/CHARTER.md` |
| Auto-Execution Pipeline | `.platform-governance/clients/envoy-hostel-tours/AUTO-EXECUTION-PIPELINE.md` |
| $10k+ Premium Delivery Check | `.platform-governance/clients/envoy-hostel-tours/premium-delivery-check.md` |
| PCR-003 | `.platform-governance/resolutions/PCR-003.md` |

---

## 5. Seal

```
DELIVERY CHECKLIST ADOPTED 2026-07-15.
8 client-visible outputs defined (verbatim from PCR-003).
C-25 binding: customer judges ONLY these 8.
```
