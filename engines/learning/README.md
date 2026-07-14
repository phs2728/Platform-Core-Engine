# Learning Engine

**Phase 8 — Platform Intelligence Memory**

The Learning Engine is the platform's self-improving intelligence layer. It is NOT an ML framework — it is a **Continuous Learning System** that accumulates experience and success patterns across projects, making the platform smarter over time.

## Vision

```
Project → Research → Creative → Experience → Publish
    → User Behavior → Analytics → Learning
    → Knowledge Update → AI Improvement → Next Project becomes Better
```

## Core Principle

**Platform은 사용할수록 똑똑해져야 한다.**

Every recommendation, design decision, and creative choice generates outcomes. The Learning Engine captures these outcomes, extracts patterns, evolves knowledge, and feeds improvements back into the Creative pipeline.

## Architecture

- **Provider Plugin**: 7 provider interfaces (ILearningProvider, IAnalyticsProvider, IBehaviorProvider, ITrendProvider, IEvidenceProvider, IFeedbackProvider, IKnowledgeProvider)
- **Evidence-Based**: all learning requires evidence — no guessing
- **Explainable**: every learning result includes observation → evidence → pattern → confidence → recommendation
- **Outcome Feedback Loop**: AI recommendation → deploy → real user behavior → CTR/conversion/bounce → learning updates confidence → next recommendation improves

## Domains

| Domain | Description |
|--------|-------------|
| LearningProject | Container for a learning cycle |
| LearningPattern | Success/failure patterns with evidence |
| Trend | Detected trends across categories |
| RecommendationFeedback | Accepted/rejected/ignored outcomes |
| KnowledgeEvolution | Knowledge versioning with confidence |
| DesignMemory | Successful hero/layout/navigation/typography/CTA patterns |
| PersonalizationProfile | Per-org/tenant/user/region/industry learning |
| LearningStatistics | Improvement rate, knowledge growth, pattern accuracy |

## Categories

Design, UX, Copy, SEO, Conversion, Accessibility, Navigation, Search, Trust, Performance, Brand, Content

## Public API (34 UseCases)

```
Learning:     createLearningProject, startLearning, completeLearning, archiveLearning, getLearningProject, listLearningProjects
Pattern:      learnSuccessPattern, learnFailurePattern, detectTrend, updateLearningModel, calculateConfidence
Recommendation: recordRecommendationResult, learnRecommendation, recommendImprovement
Design:       learnDesign, learnUX, learnCopy, learnSearch
Knowledge:    updateKnowledge, evolveKnowledge, generateLearningReport, searchLearningMemory
Analytics:    calculateLearningScore, calculateImprovementRate, generateTrendAnalysis
Memory:       getLearningMemory, updateLearningMemory, getLearningStatistics
Outcome:      recordOutcome, getDesignMemory, getPersonalizationProfile
Queries:      getPattern, listPatterns, getTrend, listTrends
```
