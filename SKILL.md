---
name: human-read-tech-html
description: Design the minimum sufficient technical solution for a software change and produce a human-readable visual HTML artifact. Scope the ask before generating content, separate facts from assumptions, choose text/table/diagram representations by information value, and avoid ceremonial architecture, ADRs, or diagrams that do not help implementation or review.
license: MIT
---

# Human Read Tech HTML

Generate a technical solution that is as small as possible while remaining unambiguous, reviewable, implementable, and safe to roll out.

The design rules live in `docs/v1-design.md`. The structured source contract lives in `schemas/solution.schema.json`.

## Core law

**Do not maximize completeness. Maximize decision usefulness.**

Never add a section, diagram, table, alternative, metric, or infrastructure component merely because a template supports it.

For every candidate content block ask:

1. Does it remove implementation ambiguity?
2. Does it expose a material trade-off or risk?
3. Does it affect rollout, rollback, or verification?
4. Does it preserve rationale future maintainers would otherwise lose?

If all answers are no, omit it.

## Workflow

### 1. Parse the ask

Extract only what is supported by the request, attached material, repository evidence, or verified external evidence:

- facts
- assumptions
- unknowns
- goals
- non-goals
- constraints
- affected components
- data changes
- request/data/state flows
- rollout constraints

Never silently convert an assumption or unknown into a fact.

### 2. Run the Scoper

Assess design pressure across:

- change scope
- data change
- call-chain complexity
- business risk
- performance/capacity impact
- technical uncertainty

Before running a full design, apply the anti-overdesign gate from `docs/v1-design.md`.

If the ask is small and already constrained by an existing implementation pattern, answer with the minimum useful blocks. A full report is not mandatory.

### 3. Build the simplest production-viable design first

Start from the smallest design that satisfies the stated goals and constraints.

Do not create alternatives by default. Add an alternative only when it is genuinely viable and differs on a load-bearing axis such as correctness, capacity, fault isolation, latency, cost, operational complexity, or delivery risk.

Three alternatives is a ceiling, not a target.

### 4. Run Research Gate only when material

Research only when an unknown can change the design, for example a new framework, middleware, protocol, external API, version constraint, transaction semantic, limit, or failure mode.

Keep research evidence concise in the final solution. Do not turn the technical solution into a research dump.

### 5. Select content blocks dynamically

Use only necessary blocks from the V1 model:

`summary`, `context`, `goals`, `change_set`, `architecture`, `flow`, `interfaces`, `data`, `decisions`, `non_functional`, `rollout`, `verification`, `risks`.

Every included block must have an explicit `reason`.

### 6. Select the simplest representation that preserves meaning

Default routing:

- simple fact or rationale → text
- structured fields/comparisons/impact/risk → table
- small before/after → table or cards
- services/components/boundaries → architecture
- cross-participant call order → sequence
- branches/process/runbook → workflow
- source/transform/store/consumer → dataflow
- state/retry/wait/terminal → lifecycle
- entity/table relationships → ER
- project phases with meaningful time dependencies → Gantt

A diagram is justified only when it communicates relationships or ordering materially better than text/table.

### 7. Route diagrams

Prefer Archify for:

- architecture
- sequence
- workflow
- dataflow
- lifecycle

Use Mermaid only as a fallback for representations Archify does not naturally cover, such as ER, Class, Gantt, Git graph, or a deliberately simple non-core diagram.

The router decides whether and what to draw. The renderer must not invent extra topology.

### 8. Write `solution.json`

`solution.json` is the source of truth.

Store semantic content and typed diagram source. Do not store generated SVG/HTML as authoritative content.

Every block and representation must record why it exists.

### 9. Render HTML

Render only blocks present in `solution.json`.

The HTML must:

- answer why / what / risk quickly on the first screen;
- use a dynamic navigation based on actual blocks;
- use diagrams for relationships, tables for structure, prose for explanation;
- avoid fake KPIs, decorative charts, and repeated restatements;
- remain readable without requiring presentation-mode theatrics.

### 10. Review and simplify

Run four checks before delivery:

- completeness relative to the selected design scope
- consistency between prose, tables, diagrams, names, before/after states
- evidence discipline for facts, assumptions, unknowns
- overdesign removal

Explicitly delete:

- data design when data does not change;
- deployment diagrams when deployment does not change;
- ADR comparisons without a real choice;
- diagrams that a short table or paragraph expresses better;
- nodes unrelated to this change;
- duplicated explanation already conveyed better elsewhere.

## Quality target

A successful result is not the longest or most complete report.

It is a solution where:

- a simple change stays simple;
- a complex change exposes the necessary complexity;
- every visual has a reason to exist;
- important decisions are traceable to facts, constraints, or explicit assumptions;
- an engineer can implement it and a reviewer can challenge it without reverse-engineering the document.
