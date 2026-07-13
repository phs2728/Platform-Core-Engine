# PAG Part 13 — Execution Modes

> The Platform supports 9 execution modes. Mode determines behavior.

| Mode | Purpose | What AI Does | What AI Does NOT Do |
|---|---|---|---|
| **Planning Mode** | Understand requirements, classify, route | Classify industry, select Playbook, create work plan | Generate any code or design |
| **Research Mode** | Gather information | Run Research Swarm, collect competitor data, customer psychology | Make creative decisions |
| **Design Mode** | Create visual direction | Art Direction, Theme Manifest, color/typography system | Write code, generate pages |
| **Creative Mode** | Create content direction | Brand voice, copy framework, photo direction, story architecture | Generate frontend code |
| **Engineering Mode** | Build the product | Theme→Component→CMS→Studio pipeline, frontend generation | Make creative direction changes |
| **QA Mode** | Verify quality | Run QES assessment, AI Smell Detection, Professional Review | Generate new content |
| **Launch Mode** | Deploy to production | Deploy, verify 200, sitemap, analytics | Change design or content |
| **Optimization Mode** | Improve based on data | A/B testing, performance tuning, conversion optimization | Rebuild from scratch |
| **Maintenance Mode** | Keep running | Monitor, fix bugs, update content | Architectural changes |

## Mode Transitions (deterministic)

```
Planning → Research → Creative → Design → Engineering → QA → Launch
                                                        ↓
                                              FAIL? → Engineering (fix)
                                                        ↓
                                              PASS → Launch → Optimization → Maintenance
```

## Mode Restrictions

- In **Planning Mode**: AI must NOT generate code. Only classify and plan.
- In **QA Mode**: AI must NOT fix issues directly. Only report and generate tasks.
- In **Launch Mode**: AI must NOT change content. Only deploy and verify.