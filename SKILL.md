---
name: human-read-tech-html
description: Design the minimum sufficient technical solution for a software change and produce a human-readable visual HTML artifact. Scope the ask before generating content, separate facts from assumptions, choose text/table/diagram representations by information value, and avoid ceremonial architecture, ADRs, or diagrams that do not help implementation or review.
license: MIT
---

# Human Read Tech HTML

Generate a technical solution that is as small as possible while remaining unambiguous, reviewable, implementable, and safe to roll out.

Read only the references needed for the current stage:

- `references/scoping-rules.md` before deciding depth;
- `references/representation-rules.md` before choosing text/table/diagram;
- `references/review-rules.md` before handoff;
- `adapters/archify.md` or `adapters/mermaid.md` only when that diagram engine is selected.

The structured source contract is `schemas/solution.schema.json`.

## Core law

**Do not maximize completeness. Maximize decision usefulness.**

Never add a section, diagram, table, alternative, metric, or infrastructure component merely because a template supports it.

## Workflow

### 1. Parse evidence

Extract only supported information from the request, files, repository, or verified external sources:

- facts
- assumptions
- unknowns
- goals / non-goals
- constraints
- affected components
- data/interface/state changes
- rollout constraints

Never silently promote an assumption or unknown to fact.

### 2. Scope before designing

Apply `references/scoping-rules.md`.

Assess six pressure dimensions: change scope, data change, call chain, business risk, performance/capacity, technical uncertainty.

If the anti-overdesign gate closes the full-design path, keep the solution minimal. A full report is not mandatory.

### 3. Build the simplest production-viable design first

Start from the smallest design that meets the stated goal and constraints.

Do not create alternatives by default. An alternative must remain genuinely viable and differ on a load-bearing axis such as correctness, capacity, fault isolation, latency, cost, operational complexity, or delivery risk.

Three alternatives is a ceiling, not a target.

### 4. Research only material unknowns

Use Research Gate only when an unknown can change the design: new middleware/framework/protocol, version/API limit, transaction/failure semantics, external service contract, or explicitly requested verification.

Keep research evidence concise in the final artifact.

### 5. Select Blocks dynamically

Candidate block types:

`summary`, `context`, `goals`, `change_set`, `architecture`, `flow`, `interfaces`, `data`, `decisions`, `non_functional`, `rollout`, `verification`, `risks`.

Every included block must have `importance` and `reason`.

A block exists only when deleting it would create ambiguity, hide a material trade-off/risk, weaken rollout/verification, or lose important rationale.

### 6. Select the simplest representation

Apply `references/representation-rules.md`.

- simple fact/rationale → text
- structured fields/risks/contracts → table
- a few parallel conclusions → cards
- components/boundaries → architecture
- ordered cross-participant calls → sequence
- branches/process/runbook → workflow
- source/transform/store/consumer → dataflow
- states/retries/terminal paths → lifecycle
- entity relationships → ER
- meaningful time dependencies → Gantt

A diagram is justified only when it communicates relationships or ordering materially better than text/table.

### 7. Route diagrams deterministically

Prefer Archify for architecture, sequence, workflow, dataflow and lifecycle.

Use Mermaid as a secondary fallback for ER, Gantt and other deliberately simple secondary diagrams.

The Skill decides whether and what to draw. The engine must not invent topology.

### 8. Write `solution.json`

`solution.json` is the source of truth.

Store semantic content and typed diagram source, never generated SVG/HTML as authoritative data.

For Archify blocks, store the actual Archify Typed JSON Source in `representation.spec`.

### 9. Validate, review and simplify

When shell access is available:

```bash
node bin/hrth.mjs validate solution.json
node bin/hrth.mjs review solution.json
```

If deterministic low-value blocks are found, simplify to a new file:

```bash
node bin/hrth.mjs simplify solution.json solution.simplified.json
```

Never overwrite the source without explicit user intent.

### 10. Compile selected diagrams

Export sources:

```bash
node bin/hrth.mjs diagrams solution.json .hrth/diagrams
```

When Archify is available, follow `adapters/archify.md`: validate and deliver each selected Archify source to `<block-id>.html` in that directory.

Do not claim Archify validation if the external deliver step did not run successfully.

### 11. Render HTML

Without compiled diagrams:

```bash
node bin/hrth.mjs render solution.json solution.html
```

With compiled diagram artifacts:

```bash
node bin/hrth.mjs render solution.json solution.html --diagram-dir .hrth/diagrams
```

Render only actual blocks. Navigation is dynamic. The first screen should answer why, what changes, design pressure and review state quickly.

### 12. Handoff discipline

Before delivery:

- run review again;
- ensure simple changes stayed simple;
- ensure every diagram and decision has a material reason;
- state unresolved material unknowns honestly;
- report whether diagrams are compiled Archify/Mermaid artifacts or semantic fallbacks.

## Regression anchors

Use the three Golden Cases when changing scoping, routing, rendering, or review behavior:

- `examples/01-simple-field`: low pressure, 0 diagrams;
- `examples/02-redis-cache`: medium pressure, intentionally 0 diagrams;
- `examples/03-kafka-async`: high pressure, exactly 2 justified Archify diagrams.

Run `npm test` after changes.
