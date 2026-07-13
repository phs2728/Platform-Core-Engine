# PAG Part 11 — Reference Project: Envoy

> Complete workflow from client interview to production deployment.

## Project: Envoy Hostel + Tours

### Step 1: Client Interview

```
Client: Envoy (hostel + tour operator in Tbilisi, Georgia)
Industry: Hospitality (Hostel + Travel)
Sub-types: Boutique Hostel, Travel Agency
Playbooks: playbook-boutique-hostel + playbook-travel-agency
```

### Step 2: Agency OS Initiation

```
1. CEO Agent defines goals:
   - "Visitors feel 'I can trust this place and book safely' within 3 seconds"
   - Convert lookers into bookers

2. Project Manager breaks down:
   - Hostel website (rooms, amenities, community)
   - Tours website (itineraries, guides, booking)
   - Shared brand identity

3. Agency Orchestrator creates Swarms:
   - Research Swarm: Tbilisi hostel market, competitor analysis
   - Creative Swarm: Brand voice (welcoming, authentic, local)
   - UX Swarm: CDA for hostel + tour decision journeys
   - Engineering Swarm: Theme → Component → CMS → Studio
```

### Step 3: Research Swarm Output

```
Customer Psychology:
  - Anxiety: "Is it safe?" "Clean?" "Good location?"
  - Questions: Price? WiFi? Airport pickup? Late check-in?
  - Trust triggers: Real guest photos, community vibe, staff faces

Objection Map:
  - Safety → staff photos, reviews, security features
  - Cleanliness → bathroom photos, cleaning schedule
  - Location → map, walking distance to attractions
  - Price → best price guarantee, no hidden fees
  - Social → community photos, events calendar
```

### Step 4: Creative Swarm Output

```
Art Direction: Modern Boutique (not luxury, not budget)
  - Whitespace: Generous but not empty (Aman-inspired, scaled down)
  - Typography: Pretendard (Korean) + Inter (English)
  - Color: Caucasus-inspired warm tones
  - Photography: Real guests, real rooms, real Tbilisi streets
  - Motion: Subtle, purposeful (scroll reveals, not decorative)

Brand Voice: "Your home in Tbilisi"
  - Warm, personal, authentic
  - No corporate speak
  - First person plural ("we", "our")
```

### Step 5: UX Swarm Output

```
CDA for Hostel Homepage:
  1. "Where is it?" → Map + neighborhood
  2. "Is it safe/clean?" → Real photos + reviews
  3. "How much?" → Transparent pricing
  4. "What's included?" → Amenities list
  5. "Can I book now?" → Availability + Book Now

Trust Architecture:
  - Hero: Real hostel exterior/community photo
  - Below fold: Booking.com reviews (verified)
  - Gallery: Real rooms (not renders)
  - Staff section: Real staff faces + names
  - Community: Guest photos (Instagram-style)

Detail Strategy (Hostel Room):
  Gallery → Room Details → Amenities → Policies → Availability → Reviews → Price + Book

Detail Strategy (Tour):
  Gallery → Timeline → Map → Guide → Included → Reviews → FAQ → Book
```

### Step 6: Engineering Execution

```
Theme Engine → ThemeManifest (warm colors, Pretendard, generous spacing)
     ↓ (read-only)
Component Engine → ComponentManifest (Hero, Gallery, Review, FAQ, Map, BookingWidget)
     ↓ (read-only)
CMS Engine → Content (room descriptions, tour itineraries, staff bios)
     ↓ (read-only)
Studio Engine → PageDraft (Homepage, Room Detail, Tour Detail, About, Contact)
     ↓
PublishIntent event → CMS publishes
```

### Step 7: Frontend Generation

```
Target: Next.js (App Router)
- React Server Components for static content
- Streaming for image-heavy pages
- Image optimization (AVIF/WebP)
- prefetch for room/tour detail pages
```

### Step 8: QES Assessment

```
QES assessPage() for Homepage:
  AI Smell Detection: 0 rejects ✅
  Professional Review: 9/9 PASS (all reviewers approve) ✅
  Category Assessment: 20/20 categories PASS ✅
  Golden Reference: vs Aman Resorts → WARNING (close but not World Class)
  Execution Level: Premium (meets required level)
  Verdict: PASS ✅
```

### Step 9: Release

```
1. QES PASS → Release approved
2. Deploy to Vercel (production)
3. Verify: curl 200, sitemap accessible, structured data valid
4. Analytics: GA4 events configured
5. Screenshot verification: desktop + mobile
```

### Step 10: Learning Feedback

```
After 30 days of production:
  Metrics:
    - Bounce rate: 38% (good)
    - CTA click rate: 12% (good)
    - Booking conversion: 4.2% (above industry avg)

  Knowledge Evolution:
    - Pattern: "Staff photos near CTA increased booking trust" → stored
    - Pattern: "Community photos in gallery increased time on page" → stored
    - Executive Memory: "Hostel → Community Photos → Booking ↑" confirmed

  QES Updates: None needed (already passing)
  Playbook Updates: Boutique Hostel playbook refined with Envoy evidence
```