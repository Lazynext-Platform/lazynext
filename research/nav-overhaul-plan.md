# UX/Nav Overhaul Plan

## Problem
- 181 nav links in Shell.tsx (176 hidden on medium screens)
- 159 dashboard tiles (flat grid, no search, no categories)
- Users can't find features — everything is equally prominent

## Design: Categorized Navigation

### Primary Nav (always visible, 6 items)
1. **Dashboard** — home/overview
2. **Create** — creative generation tools (dropdown)
3. **Optimize** — testing, performance, analytics (dropdown)
4. **Manage** — campaigns, assets, publishing (dropdown)
5. **Insights** — market intel, trends, audience (dropdown)
6. **Settings** — account, billing, team

### Dashboard Categories (8 groups)

#### 1. Flagship Studios (4)
The 4 premium production apps:
- UGC Product Ad (lazynext-studio)
- Reference to Ad (ad-reference)
- AI Drama Ad (drama-studio)
- Ad Skit (ad-skit)

#### 2. Creative Strategy (12)
Brief and concept tools:
- Creative Studio, Creative Director, Product Brief, Reference Remix
- Multi-Concept, Brief Intelligence, Brief Analyzer, Brief Template Builder
- Concept Expander, Concept Expander Pro, Concept Merger, Concept Validator

#### 3. Copy & Messaging (20)
Text generation tools:
- Ad Copy Generator, Ad Headline Generator, Ad Caption Generator
- Ad CTA Optimizer, Ad Script Writer, Ad Story Generator
- Ad Voiceover Script Generator, Ad Hashtag Generator
- Hook Library, Hook Tester, Hook Revamp Generator, Hook Matrix Generator
- Creative Angle Finder, Creative Brief Generator
- Messaging Framework Builder, PAS Framework, BAB Framework, FAB Framework
- Demonstration Framework, Comparison Framework

#### 4. Persuasion & Psychology (22)
Emotional and behavioral design:
- Emotional Anchor, Emotional Pivot, Emotion Sequencer
- Fear Appeal, Pride Appeal, Humor Appeal, Belonging Appeal
- Liking/Affinity, Desire Amplifier, Empathy Bridge
- Belief Shift, Identity Alignment, Social Proof, Social Momentum
- Authority Positioning, Trust Accelerator, Urgency Catalyst
- Scarcity Frame, Objection Neutralizer, Risk Reversal
- Micro-Commitment, Testimonial Architecture

#### 5. Behavioral Economics (13)
Pricing and offer psychology:
- Anchoring Effect, Price Framing, Decoy Effect
- Loss Aversion, Reciprocity Trigger, Endowment Effect
- Framing Effect, Nostalgia Trigger, Offer Architecture
- Value Ladder, Viewer Reward, Anticipation Builder
- Persuasion Strategist

#### 6. Narrative & Pacing (17)
Story structure tools:
- Story Arc, Tension Release, Tension Release Strategist
- Climax Architect, Foreshadowing, Resolution
- Transformation Arc, Stakes Escalation, Micro-Moment
- Callback Memory, Memory Anchor, Narrative Twist
- Curiosity Gap, Curiosity Loop, Surprise Element
- Pattern Interrupt, Sequencer

#### 7. Analytics & Intelligence (20)
Performance and market tools:
- Performance, Performance Loop, Performance Predictor
- Performance Forecaster, Forecasting, Quality Scorer
- Quality Scoring, Fatigue Detector, Creative Fatigue Detector
- Burnout Detector, Emotion Analyzer, Sentiment Tuner
- Sentiment Journey Mapper, Audience Resonance Predictor
- Audience Pain Point Mapper, Audience Psychographic Profiler
- Audience Segment Builder, Audience Persona Generator
- Audience Insights, Persona Engine

#### 8. Market & Competitive (8)
External intelligence:
- Competitor Intel, Competitor Watch, Competitive Intelligence
- Trend Intelligence, Trend Spotter, Trend Adapter
- Viral Analyzer, Viral Analysis

#### 9. Production & Asset (15)
Media and format tools:
- Creative Assets, Creator Kits, Brand Concepts
- Clip Editor, Media Service Boundary, Image Studio
- Audio Studio, Scene Generator, Scene Analysis
- Shot Planner, Color Palette Generator, Font Pairing Generator
- Thumbnail Generator, Music Mood Matcher, Mood Board

#### 10. Campaign Management (12)
Orchestration and publishing:
- Ads, Campaign Orchestrator, Pipeline, Workflow Builder
- Smart Calendar, Calendar, Budget Optimizer, Budget Allocator
- A/B Automation, A/B Test Planner, A/B Test Name Generator
- A/B Test Simulator, Testing Lab, Publish

#### 11. Brand & Compliance (8)
Brand voice and safety:
- Brand Voice, Brand Voice Analyzer, Brand Voice Consistency Checker
- Brand Story Architect, Brand Guardrails, Meta Safety
- Google Safety, Compliance

#### 12. Platform & Infrastructure (10)
Dev/infra tools:
- Editor, Skills, Skill Chains, Skill Chain Builder
- Skill Library, MCP Server, ML Insights, Templates
- Inspiration, Leaderboard

## Implementation Plan

### Step 1: Create category config
Create `src/config/navCategories.ts` with the category structure above.

### Step 2: Redesign Shell nav
Replace 181 flat links with:
- 6 primary nav items (always visible)
- Dropdown menus for Create, Optimize, Manage, Insights
- Mobile: hamburger menu with categorized list

### Step 3: Redesign Dashboard
Replace 159 flat tiles with:
- Search bar (filter by name/description)
- Category tabs/sections
- "Flagship" section at top (4 premium apps)
- Collapsible category sections
- Recently used section (localStorage)

### Step 4: Add feature search
- Search input in nav and dashboard
- Fuzzy match on title, description, and category
- Keyboard shortcut (Cmd+K) for quick search

### Step 5: Guided flows
- "Create a video ad" flow (brief → script → storyboard → generate)
- "Optimize performance" flow (analyze → score → improve → A/B test)
- "Launch campaign" flow (create → compliance → publish → monitor)
