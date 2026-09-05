---
name: human-read-tech-html
description: Build an evidence-backed, minimum-sufficient technical solution, detect the engineering concerns that must be answered, separate the semantic solution model from the human reading view, and compile the result into a progressive-disclosure HTML artifact. Prefer V2 schema 0.2 for new medium/high designs while preserving V1 compatibility.
license: MIT
---

# Human Read Tech HTML

Create technical solutions that may be deep for engineers but remain bounded and coherent for first-time readers.

The default V2 mental model is a compiler pipeline, not a fixed document template:

```text
Understand
  ↓
Detect Concerns
  ↓
Design
  ↓
Decide
  ↓
Plan Narrative
  ↓
Choose Presentations
  ↓
Compile Document AST
  ↓
Render / Review
```

Read only the references needed for the current stage:

- `references/scoping-rules.md` before deciding design depth;
- `references/concern-rules.md` before activating engineering question packs;
- `references/reading-rules.md` for human reading principles;
- `references/representation-rules.md` before choosing text/table/cards/diagram;
- `references/review-rules.md` before handoff;
- `docs/v2-design.md` when creating or modifying schemaVersion `0.2` artifacts;
- diagram adapters only when that engine is selected.

Use `schemas/solution.v2.schema.json` for new V2 artifacts. `schemas/solution.schema.json` remains the V1 compatibility contract.

## Design laws

1. **Do not maximize completeness. Maximize decision usefulness.**
2. **Technical depth and first-read burden are separate budgets.** A complex system may need deep implementation material without exposing all of it at once.
3. **Problem before solution.** Do not silently convert a requested technology into the actual goal.
4. **Concern before chapter.** Detect the engineering questions that matter; never create sections merely because a template contains them.
5. **Model before View.** Technical truth must not depend on how the current reader sees it.
6. **Bottom line before background.** State the selected solution before long explanation.
7. **Conclusion → reasons → evidence.** Do not make the reader reconstruct the answer from raw facts.
8. **One semantic block may have multiple presentations.** A diagram can explain topology while text explains the load-bearing boundary or consequence.
9. **Progressive disclosure over full exposure.** Support Scan, Understand, Implement and Reference depths.
10. **One view, one main story.** Diagrams, tables, cards and sections each need one dominant purpose.
11. **Unknown is a valid engineering state.** Never manufacture certainty to make review green.

# V2 workflow

## 1. Understand the problem

Extract only supported information from the request, files, repository and verified external sources:

- facts;
- assumptions;
- unknowns;
- actual problem / motivation;
- goals and non-goals;
- constraints;
- affected systems and actors;
- data/interface/state changes;
- rollout constraints.

Do not accept implementation wording as the goal without checking the underlying problem.

Example:

```text
User wording: "把同步后处理改成 Kafka"
Problem: synchronous post-processing expands latency/failure coupling
Candidate mechanism: Kafka async boundary
```

Every Evidence item needs a stable lowercase id. A material conclusion should be traceable through `sourceRefs` when specific evidence constrains it.

Never silently promote an assumption or unknown to a fact.

## 2. Scope before designing

Apply all six pressure dimensions from `references/scoping-rules.md`:

- change scope;
- data change;
- call chain;
- business risk;
- performance/capacity;
- technical uncertainty.

Use the anti-overdesign gate before creating a deep design.

Content Budget is a ceiling, never a quota.

A small change may remain V1-compatible and simple. New medium/high designs should normally use schemaVersion `0.2` so Model and View stay separated.

## 3. Detect engineering Concerns

Apply `references/concern-rules.md`.

Concern Packs are question sets, not document sections.

Built-in packs currently include:

- `async-messaging`;
- `cache`;
- `data-migration`;
- `external-api`.

Activate only material packs.

For every activated question set one state:

- `answered`;
- `unknown`;
- `not_applicable`.

An answered concern should normally point to one or more semantic `blockRefs` and/or `evidenceRefs`.

Do not expose a Concern Pack as a first-level chapter merely because it was activated.

## 4. Build the Solution Model

The V2 `model.blocks[]` layer contains technical semantics only.

Candidate semantic block types remain deliberately small:

`summary`, `context`, `goals`, `change_set`, `architecture`, `flow`, `interfaces`, `data`, `decisions`, `non_functional`, `rollout`, `verification`, `risks`.

A Block exists only when removing it would:

- create implementation ambiguity;
- hide a material trade-off/risk;
- weaken rollout, rollback or verification;
- lose rationale future maintainers need.

Every Block must include:

- stable `id`;
- semantic `type`;
- `importance`;
- generator/reviewer `reason`;
- semantic `content`;
- `sourceRefs` when needed.

### V2 separation rule

Never put either of these inside a V2 Model Block:

```text
reading
representation
```

The Model answers **what is technically true / selected**.

The View later answers **when and how a reader sees it**.

## 5. Record real Decisions

Create a Decision semantic block only when two or more live alternatives differ on a load-bearing axis such as:

- correctness;
- failure isolation;
- capacity/latency;
- cost;
- operational complexity;
- delivery risk.

Prefer the light MADR meaning:

```text
Question / Context
→ Drivers
→ Options
→ Selected
→ Rationale
→ Consequences
```

Do not manufacture three alternatives because a template allows three.

## 6. Plan the human View

The V2 `view` is a separate artifact layer over the Solution Model.

### Scan

`view.brief` is the 30-second layer:

- `bottomLine`;
- 2–5 `keyChanges`;
- optional `impact`;
- 0–3 `keyRisks`;
- optional `delivery`.

It is a navigation summary, not a duplicate report.

### Understand

Use `layer: "understand"` for the 3–5 minute main reading path.

Prefer reader-question titles such as:

- 这次到底改变了什么
- 新方案怎么工作
- 为什么这样设计
- 哪些边界最重要
- 怎么安全上线并证明可恢复

Do not mechanically expose internal taxonomy such as interface/data/non-functional as first-level reading order.

### Implement

Use `layer: "implement"` for details needed during implementation or deep review:

- exhaustive interfaces;
- data fields;
- config;
- timeout/retry parameters;
- operational thresholds;
- test matrices;
- migration details.

This material may be heavy. It simply should not dominate the first read.

### Reference

Use `layer: "reference"` for evidence, assumptions, research sources and exhaustive lookup material.

## 7. Use narrative slots as a bounded compatibility vocabulary

Current V2 View Groups map into six stable narrative slots:

- `overview`
- `design`
- `decisions`
- `delivery`
- `details`
- `appendix`

The reader-facing `title` may be question-oriented and specific to the solution.

The slot is a compiler/layout boundary, not a command to generate six sections. Empty slots do not appear.

## 8. Choose Presentations after the View is known

Each View Item references one semantic Block and declares one or more Presentation Nodes.

Available presentation kinds currently include:

- text;
- table;
- cards;
- architecture;
- sequence;
- workflow;
- dataflow;
- lifecycle;
- er;
- gantt.

Choose the simplest representation that materially improves comprehension at that reading layer.

### Multiple presentations are allowed

Example:

```text
architecture semantic block
  ├─ architecture diagram: shows components and boundaries
  └─ text: states the one failure-isolation conclusion the reader must remember
```

This is preferred over either:

- forcing all rationale into diagram labels; or
- repeating the complete diagram edge-by-edge in prose.

### Diagram gate

Generate a diagram only when relationship, ordering, branch, boundary, state or data movement is materially clearer than prose/table.

If 3–5 sentences or a compact table is equally clear, do not draw.

Prefer Archify for architecture/sequence/workflow/dataflow/lifecycle and Mermaid for ER/Gantt fallback.

## 9. Compile to Document AST

For schemaVersion `0.2`, `compileDocumentAst()` creates the stable boundary between semantic Model and rendering.

A Presentation Node carries:

- semantic `blockRef`;
- reading `layer` and narrative `slot`;
- presentation kind/engine;
- content/spec;
- Evidence refs.

The same semantic Block can therefore be reused by multiple presentation nodes without duplicating technical truth in the Model.

V2 currently compiles the AST to the stable V1 runtime representation so existing validation, diagram freshness and HTML renderer behavior are preserved during migration.

## 10. Validate and review

When shell access is available:

```bash
node bin/hrth.mjs validate solution.json
node bin/hrth.mjs review solution.json
```

The CLI auto-detects schemaVersion `0.1` or `0.2`.

V2 Review must consider both:

### Deterministic structure

- Model/View separation;
- block refs;
- presentation specs;
- Evidence refs;
- Concern Pack ids and answer states;
- compiled V1 runtime validity;
- existing diagram routing/freshness rules.

### Human/semantic review

- did we solve the actual problem rather than obey a requested technology blindly;
- are all material Concern questions answered or honestly unknown;
- can a reviewer understand the selected solution without opening implementation details;
- is a diagram carrying relationships while prose carries rationale/boundary/consequence;
- is repeated exposition actually adding meaning;
- are implementation details promoted to the main path only when load-bearing.

Warnings are review prompts, not a reason to manufacture sections.

## 11. Compile diagrams

```bash
node bin/hrth.mjs diagrams solution.json .hrth/diagrams
```

For V2, diagram ids are Presentation Node ids rather than semantic Block ids when a Block has multiple presentations.

Keep the existing source-hash and receipt discipline. Do not embed stale or unverifiable diagram artifacts.

## 12. Render HTML

```bash
node bin/hrth.mjs render solution.json solution.html
```

or:

```bash
node bin/hrth.mjs render solution.json solution.html --diagram-dir .hrth/diagrams
```

V2 reader-facing group titles come from `view.groups[].title` while stable narrative slots continue to control the current renderer layout and progressive disclosure behavior.

## 13. Useful V2 commands

List built-in Concern Packs:

```bash
node bin/hrth.mjs concerns
```

Inspect the compiled compatibility runtime form:

```bash
node bin/hrth.mjs compile solution.v2.json compiled.v1.json
```

`compile` is for debugging/inspection; the V2 source remains authoritative.

## 14. Handoff discipline

Before delivery:

- run validate and review;
- ensure the selected solution is stated in the brief;
- ensure no activated material Concern is silently skipped;
- ensure Model Blocks contain no View metadata;
- ensure the Understand path is bounded and question-oriented;
- ensure Implement/Reference content is available without dominating the first read;
- ensure every diagram and real decision earns its place;
- ensure material conclusions can point to Evidence where needed;
- state unresolved unknowns honestly;
- report whether diagrams are compiled artifacts or semantic fallbacks.

# Regression anchors

Use these examples when changing the compiler:

- `01-simple-field` — V1 low-pressure compatibility;
- `02-redis-cache` — V1 medium-pressure no-diagram anchor;
- `03-kafka-async` — V1 high-pressure compatibility;
- `04-kafka-v2` — V2 Model/View/Document AST, Concern coverage and multiple presentations.

Run:

```bash
npm test
```

# Explicit non-goals

Do not turn V2 into:

- a fixed 10/12-section template;
- a system where every plugin invents new Block vocabulary;
- an all-concerns-on-by-default checklist;
- a full architecture knowledge base;
- an AI second-review service added only to score prose similarity;
- a renderer-heavy design system whose visual complexity exceeds the technical value.

The architecture may become heavier. The generated reading experience should become lighter.
