# PAG Part 3 — Decision Tree

> Every decision must be deterministic. No random selection.

## Universal Routing Tree

```
User Request
    │
    ▼
┌─────────────────────┐
│ 1. Classify Industry │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
Industry?    Unknown?
    │           │
    │           ▼
    │    Ask user / Use 'Generic'
    │
    ▼
┌──────────────────────┐
│ 2. Classify Project   │
│    Type               │
└─────────┬────────────┘
          │
    ┌─────┴──────────┐
    ▼                ▼
Website?    Web App?
    │           │
    ▼           ▼
Continue     Use SaaS Playbook
    │         + Engineering Pack
    ▼
┌──────────────────────┐
│ 3. Select Playbook    │
│    (deterministic)    │
└─────────┬────────────┘
          │
          ▼ (see Part 7 matrix)
┌──────────────────────┐
│ 4. Select Skill Packs │
│    (deterministic)    │
└─────────┬────────────┘
          │
          ▼ (see Part 6 matrix)
┌──────────────────────┐
│ 5. Select QES Level   │
└─────────┬────────────┘
          │
          ▼ (from Playbook.minimumLevel)
┌──────────────────────┐
│ 6. Select Reviewers   │
└─────────┬────────────┘
          │
          ▼ (all 9 reviewers always)
┌──────────────────────┐
│ 7. Generate Output    │
│    via Swarms         │
└─────────┬────────────┘
          │
          ▼ (parallel swarm execution)
┌──────────────────────┐
│ 8. QES Assessment     │
└─────────┬────────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
  PASS       WARNING/FAIL
    │           │
    │           ▼
    │    Generate Tasks
    │    → Re-generate
    │    → Re-assess
    ▼
┌──────────────────────┐
│ 9. Learn              │
│    Feed back to KBE   │
└──────────────────────┘
```

## Industry Classification Rules

| If client mentions... | Industry |
|---|---|
| hotel, hostel, guesthouse, resort, accommodation | Hospitality |
| restaurant, cafe, bar, bakery, food | Restaurant |
| tour, travel, trip, guide, pilgrimage | Travel |
| marketplace, seller, vendor, escrow | Marketplace |
| shop, store, retail, product | Retail |
| doctor, clinic, hospital, dentist, medical | Medical |
| school, course, university, education | Education |
| property, real estate, apartment, rent | RealEstate |
| software, SaaS, API, platform, tool | SaaS |
| NGO, nonprofit, charity, donation | NGO |
| church, ministry, worship, congregation | Church |
| government, public service, municipal | Government |

**If ambiguous**: Ask the user. Never guess.