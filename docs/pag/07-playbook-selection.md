# PAG Part 7 — Playbook Selection Rules

> Industry → Playbook → Variants → Detail DNA → Journeys

## Playbook Selection Matrix (Deterministic)

| Industry | Sub-type | Playbook ID |
|---|---|---|
| Hospitality | Luxury Hotel | `playbook-luxury-hotel` |
| Hospitality | Boutique Hostel | `playbook-boutique-hostel` |
| Restaurant | Restaurant | `playbook-restaurant` |
| Restaurant | Coffee Shop | `playbook-coffee-shop` |
| Travel | Travel Agency | `playbook-travel-agency` |
| Travel | Pilgrimage | `playbook-pilgrimage` |
| Marketplace | — | `playbook-marketplace` |
| SaaS | Landing | `playbook-saas-landing` |
| SaaS | Law Firm | `playbook-law-firm` |
| SaaS | Corporate | `playbook-corporate` |
| NGO | — | `playbook-ngo` |
| Church | — | `playbook-church` |
| Medical | Clinic | `playbook-medical-clinic` |
| Medical | Dentist | `playbook-dentist` |
| Education | University | `playbook-university` |
| Government | — | `playbook-government` |

## Selection Algorithm

```
function selectPlaybook(industry, subType):
    key = subType ? `${industry}-${subType}` : industry
    playbook = PLAYBOOK_REGISTRY.get(`playbook-${key}`)
    if playbook is null:
        return DEFAULT_PLAYBOOK  // 'pack-premium-website-foundation' based
    return playbook
```

## Playbook → Journey Mapping

Every Playbook activates three journeys:

### Customer Journey (10 stages)
```
Problem → Discovery → Comparison → Evaluation → Trust
→ Decision → Action → Experience → Loyalty → Advocacy
```

### Trust Journey
```
Unaware → Curious → Skeptical → Cautiously Optimistic → Confident → Advocate
```

### Decision Journey
```
Need Recognition → Information Search → Alternative Evaluation
→ Purchase Decision → Post-Purchase Evaluation
```

## Playbook Sections (24 per Playbook)

Each Playbook defines all 24 sections (see ALL_PLAYBOOK_SECTIONS in code).
The AI must implement every `required: true` section.