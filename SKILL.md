---
name: human-read-tech-html
description: Design the minimum sufficient technical solution for a software change and produce a human-readable visual HTML artifact. Scope the ask before generating content, separate facts from assumptions, plan the reading narrative before rendering, choose text/table/diagram representations by information value, and avoid ceremonial architecture, ADRs, or details that do not help implementation or review.
license: MIT
---

# Human Read Tech HTML

Generate a technical solution that is as small as possible while remaining unambiguous, reviewable, implementable, safe to roll out, and easy for a human to consume at multiple depths.

Read only the references needed for the current stage:

- `references/scoping-rules.md` before deciding depth;
- `references/reading-rules.md` before composing the human reading order;
- `references/representation-rules.md` before choosing text/table/diagram;
- `references/review-rules.md` before handoff;
- `adapters/archify.md` or `adapters/mermaid.md` only when that diagram engine is selected.

The structured source contract is `schemas/solution.schema.json`.

## Design laws

1. **Do not maximize completeness. Maximize decision usefulness.**
2. **Bottom line before background.** State the proposed solution before long explanation.
3. **Progressive disclosure over full exposure.** Support a 30-second scan, a 3-minute understanding pass, and an implementation-depth read.
4. **Blocks are semantic units, not chapters.** Never expose the internal Block list as the table of contents by default.
5. **Group by reader questions, not data types.** Prefer “方案怎么工作” over a flat “接口 / 数据 / 非功能” taxonomy.
6. **Conclusion → reasons → evidence.** Do not force the reader to reconstruct the conclusion from raw facts.
7. **One view, one main story.** A section, table, card group, or diagram should have one dominant purpose.
8. **Complexity may increase depth, not first-read burden.** More complex systems may have more detail, but the first read stays bounded.

Never add a section, diagram, table, alternative, metric, infrastructure component, or paragraph merely because a template supports it.

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

Every evidence item must have a stable lowercase `id`. When a Block materially depends on specific evidence, connect it with `sourceRefs` rather than repeating or silently promoting the evidence.

Never silently promote an assumption or unknown to fact.

### 2. Scope before designing

Apply `references/scoping-rules.md`.

Assess all six pressure dimensions: change scope, data change, call chain, business risk, performance/capacity, technical uncertainty. Do not omit a dimension because it appears irrelevant; mark it `low` instead.

If the anti-overdesign gate closes the full-design path, keep the solution minimal. A full report is not mandatory.

### 3. Build the simplest production-viable design first

Start from the smallest design that meets the stated goal and constraints.

Do not create alternatives by default. An alternative must remain genuinely viable and differ on a load-bearing axis such as correctness, capacity, fault isolation, latency, cost, operational complexity, or delivery risk.

Three alternatives is a ceiling, not a target.

### 4. Research only material unknowns

Use Research Gate only when an unknown can change the design: new middleware/framework/protocol, version/API limit, transaction/failure semantics, external service contract, or explicitly requested verification.

Keep research evidence concise in the final artifact.

### 5. Select semantic Blocks dynamically

Candidate block types:

`summary`, `context`, `goals`, `change_set`, `architecture`, `flow`, `interfaces`, `data`, `decisions`, `non_functional`, `rollout`, `verification`, `risks`.

Every included Block must have `importance` and `reason`.

A Block exists only when deleting it would create ambiguity, hide a material trade-off/risk, weaken rollout/verification, or lose important rationale.

**A Block is not a chapter.** It is an internal semantic unit that the Narrative Planner may group, nest, collapse, or move to the appendix.

### 6. Plan the human reading narrative

Apply `references/reading-rules.md` before finalizing representation.

Create a compact `brief` for the first screen:

- `bottomLine`: the proposed solution in one concise statement;
- `keyChanges`: normally 2–5 material changes;
- optional `impact`: the most useful impact/boundary statement;
- `keyRisks`: normally 0–3 material risks or constraints;
- optional `delivery`: rollout/verification conclusion when it matters.

For each Block assign reading metadata when useful:

```json
{
  "reading": {
    "role": "core | detail | reference",
    "group": "overview | design | decisions | delivery | details | appendix"
  }
}
```

`importance` answers “does this matter technically?”; `reading.role` answers “when does the reader need to see it?”. They are deliberately different.

Use these default first-level reading groups only when they contain material content:

- `overview` → 先看结论
- `design` → 方案怎么工作
- `decisions` → 为什么这样设计
- `delivery` → 如何安全上线
- `details` → 实现细节
- `appendix` → 依据与附录

Keep first-level groups within the Reading Budget from `reading-rules.md`. Promote detail to `core` only when it is load-bearing for this specific change.

The Narrative Planner may reorder/expose existing content, but must not invent technical facts or components.

### 7. Select the simplest representation

Apply `references/representation-rules.md` after reading depth is known.

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

Do not repeat a diagram’s topology edge-by-edge in prose. Use prose for rationale, boundary, exception, or consequence.

### 8. Route diagrams deterministically

Prefer Archify for architecture, sequence, workflow, dataflow and lifecycle.

Use Mermaid as a secondary fallback for ER, Gantt and other deliberately simple secondary diagrams.

The Skill decides whether and what to draw. The engine must not invent topology.

### 9. Write `solution.json`

`solution.json` is the source of truth.

Store semantic content, the compact first-read `brief`, reading metadata, and typed diagram source. Never store generated SVG/HTML as authoritative data.

For Archify Blocks, store the actual Archify Typed JSON Source in `representation.spec`.

Every Evidence item needs a unique stable `id`; every `sourceRefs` entry must resolve to one of those ids.

For new medium/high-pressure solutions, provide `brief` and explicit reading metadata rather than relying on renderer defaults.

### 10. Validate, review and simplify

When shell access is available:

```bash
node bin/hrth.mjs validate solution.json
node bin/hrth.mjs review solution.json
```

Validation checks structural requirements, all six scoping dimensions, Evidence/reference integrity, reading metadata, representation routing, and supported Archify reference integrity.

Review checks completeness, anti-overdesign, evidence integrity, and readability. Readability warnings include excessive first-read burden, too many visible groups/core Blocks, missing narrative metadata on complex solutions, or reference/detail content exposed too early.

Treat warnings as review prompts, not a reason to manufacture fixed chapters.

If deterministic low-value Blocks are found, simplify to a new file:

```bash
node bin/hrth.mjs simplify solution.json solution.simplified.json
```

Never overwrite the source without explicit user intent.

### 11. Compile selected diagrams

Export sources:

```bash
node bin/hrth.mjs diagrams solution.json .hrth/diagrams
```

The exporter records a `sourceHash` in `manifest.json` and removes stale compiled HTML only when the source changes.

When Archify is available, follow `adapters/archify.md`: validate and deliver each selected Archify source to `<block-id>.html` in that directory. A receipt with the matching `sourceHash` is recommended after successful validation/delivery.

Do not claim Archify validation if the external deliver step did not run successfully.

### 12. Render HTML

Without compiled diagrams:

```bash
node bin/hrth.mjs render solution.json solution.html
```

With compiled diagram artifacts:

```bash
node bin/hrth.mjs render solution.json solution.html --diagram-dir .hrth/diagrams
```

The renderer must compose Blocks into Reading Groups rather than flattening them into first-level chapters.

Default exposure:

- `core` → visible in the main reading flow;
- `detail` → grouped under implementation details and collapsed by default where appropriate;
- `reference` → appendix/reference area;
- Evidence/assumptions/unknowns → appendix, never the main narrative.

The first screen must lead with the bottom line and key changes, not internal metrics such as Block/diagram counts.

Block `reason` is generator/reviewer metadata. Do not render it as a repeated reader-facing “为什么保留” paragraph.

When a diagram manifest hash does not match the current `representation.spec`, or a supplied receipt is invalid, do not embed the artifact. Fall back honestly to the semantic representation and surface a review warning.

### 13. Handoff discipline

Before delivery:

- run review again;
- ensure simple changes stayed simple;
- ensure the BLUF actually states the selected solution rather than summarizing only background;
- ensure a reviewer can understand why/what/how from the core reading groups without opening details;
- ensure implementation detail is available without dominating the first read;
- ensure every diagram and decision has a material reason;
- ensure material Block conclusions can point to their evidence ids where needed;
- state unresolved material unknowns honestly;
- report whether diagrams are compiled Archify/Mermaid artifacts or semantic fallbacks;
- never hide a stale or unverifiable diagram artifact behind a successful-looking page.

## Regression anchors

Use the three Golden Cases when changing scoping, narrative planning, routing, rendering, or review behavior:

- `examples/01-simple-field`: low pressure, 0 diagrams, first-level reading groups <= 3;
- `examples/02-redis-cache`: medium pressure, intentionally 0 diagrams, first-level reading groups <= 5;
- `examples/03-kafka-async`: high pressure, exactly 2 justified Archify diagrams, first-level reading groups <= 6 even though it has many semantic Blocks.

Negative validation and stale-artifact regressions live in `tests/validation.mjs`.

Run `npm test` after changes.
