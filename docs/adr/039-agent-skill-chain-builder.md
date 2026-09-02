# ADR-039: Agent Skill Chain Builder with Conditional Branching

**Date:** 2026-08-30
**Status:** Accepted

## Context

LazyNext already had a skill library (`src/lib/creative/skill-library.ts`, ADR-010) that supports
linear skill chaining — a sequence of skills executed in order, where each step's output feeds
the next step's input. Linear chaining works for fixed workflows, but creative production is
adaptive: the right next step often depends on what the previous step produced. A hook that
underperforms should branch to a re-generation step; a platform-specific output should branch to
a platform-optimized polish step. Linear chains cannot express this.

Conditional branching lets a chain adapt at runtime based on the output of prior steps. This is
essential for adaptive creative workflows: regenerate on weak hooks, optimize per platform, or
escalate to a higher-cost skill when a quality threshold isn't met. Without branching, marketers
had to manually inspect intermediate outputs and manually trigger the right next skill, breaking
the automation promise of skill chains.

The patterns were drawn from several skill-based agent projects that demonstrated branching skill
graphs: `aiads-skills`, `ad-video-skills`, `superCMO-skills`, and `skill-adsturbo`.

## Decision

### 1. New module `src/lib/creative/skill-chain-builder.ts`

A dedicated domain library that extends the skill library with conditional branching. The module
defines enhanced chain types and an execution function that evaluates branches after each step,
selecting the next step dynamically based on prior outputs.

### 2. Enhanced chain types with `BranchStep` and `ChainCondition`

The module introduces `BranchStep` (a step with conditional branches rather than a fixed next
step) and `ChainCondition` (the predicate evaluated to select a branch). Enhanced chains can mix
linear steps and branch steps, so a chain can be mostly linear with branching only where
adaptivity is needed.

### 3. Condition types

`ChainCondition` supports five condition types: `output_contains` (branch if the prior output
contains a substring), `output_gt` (branch if a numeric metric exceeds a threshold),
`output_lt` (branch if a numeric metric is below a threshold), `output_equals` (branch if a
value matches exactly), and `platform_is` (branch based on the target platform). These cover the
common adaptive creative workflow decisions.

### 4. 3 built-in enhanced chains with branching

Three built-in chains ship with the module: `adaptive-hook` (regenerates hooks that score below
a threshold), `platform-optimized` (branches to platform-specific polish steps based on the
target platform), and `performance-driven` (branches based on prior performance metrics). These
serve as both ready-to-use workflows and reference implementations for custom branching chains.

### 5. `executeEnhancedChain()` evaluates branches after each step

The execution function runs each step, then evaluates any branch conditions on that step's
output to select the next step. If no branch condition matches, the chain falls through to the
default next step (or terminates if none is defined). This makes branching opt-in per step.

### 6. 8-credit cost per execution

Each enhanced chain execution costs 8 credits, reflecting the higher complexity and typically
longer chain length compared to a linear chain. Credits are deducted before execution and
refunded on failure, following existing conventions.

### 7. API route at `/api/creative/skill-chain-builder`

The route supports listing built-in chains, validating custom chains, and executing chains. It
requires authentication, deducts 8 credits before execution, and refunds on failure. Input
validation enforces structural correctness on custom chains before execution.

### 8. UI page at `/skill-chains`

A new page with a `SkillChainBuilder` component lets users visually assemble enhanced chains,
define branch conditions, select from built-in chains, and execute chains while viewing
step-by-step progress and branch decisions.

## Consequences

- **Positive:** Enables adaptive creative workflows that branch based on intermediate outputs,
  closing the gap between fixed linear chains and truly autonomous creative production.
- **Positive:** The five condition types cover the common adaptive decisions without making the
  condition model overly complex.
- **Positive:** Three built-in chains give users immediate value and serve as reference
  implementations for custom branching.
- **Negative:** Branches add complexity. A poorly designed branch condition can create
  unintentional loops or dead ends, so branch chains must be pre-validated before execution.
- **Negative:** Condition evaluation is best-effort. String-contains and numeric-threshold
  checks are heuristic and may not capture the full semantic intent of a step's output.

## Research Sources

Inspired by `aiads-skills` (MIT license, issue #19), `ad-video-skills` (MIT license, issue #33),
`superCMO-skills` (MIT license, issue #36), and `skill-adsturbo` (MIT license, issue #39). Took
the branching skill graph pattern — conditional next-step selection based on prior step output —
and the built-in chain templates that demonstrate common adaptive workflows. Adapted to
LazyNext's TypeScript / Atlas-based skill infrastructure and existing `skill-library.ts`. Did
NOT copy the original skill definitions or agent code; the module is a clean TypeScript
implementation against LazyNext's existing skill library.
