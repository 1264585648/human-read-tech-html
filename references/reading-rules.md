# Reading Rules

The Solution Model is written for machines and agents; the final artifact is written for people.

V2 therefore separates **technical semantics** from **human reading order**.

## Design laws

1. **Decision usefulness over completeness.** Include only information that changes implementation, review, rollout, verification, or an important decision.
2. **Bottom line before background.** State the selected solution before long context or analysis.
3. **Progressive disclosure over full exposure.** A reader should be able to stop after Scan, Understand, Implement or Reference depth without losing coherence.
4. **Blocks are semantic units, not chapters.** V2 Model Blocks contain no reading metadata.
5. **Group by reader questions, not data types.** Prefer “新方案怎么工作” over a flat “接口 / 数据 / 非功能” taxonomy.
6. **Conclusion → reasons → evidence.** Lead with the conclusion, then rationale, then proof/source material.
7. **One view, one main story.** A section, table, card group or diagram should have one dominant purpose.
8. **Complexity may increase depth, not first-read burden.** More implementation detail should move deeper rather than expand the first pass without bound.

These rules borrow useful ideas from BLUF / inverted pyramid, the Minto Pyramid Principle, progressive disclosure, information scent, chunking, C4-style zoom levels and signal-to-noise reduction without importing their full templates.

## Four reading depths

### Scan — about 30 seconds

Use `view.brief` in V2 (legacy `brief` in V1).

It should answer:

- what are we proposing;
- what changes materially;
- what is affected;
- what are the biggest risks/constraints;
- how will rollout/verification work when relevant.

The brief is a compact index, not a second copy of the report.

### Understand — about 3–5 minutes

Use `layer: "understand"`.

A reviewer should understand the selected design and the most challengeable decision without opening implementation details.

Good first-level reader questions:

- 这次到底改变了什么
- 新方案怎么工作
- 为什么这样设计
- 哪些边界最重要
- 怎么安全上线并证明可恢复

Not every solution needs every question as a separate group.

### Implement — on demand

Use `layer: "implement"` for implementation lookup:

- exhaustive interface contracts;
- storage fields;
- configuration;
- timeout/retry values;
- secondary flows;
- migration/runbook details;
- test matrices;
- operational thresholds.

This layer may be heavy. It should simply not dominate the first read.

### Reference — on demand

Use `layer: "reference"` for:

- Evidence;
- Assumptions;
- Unknowns;
- research sources;
- exhaustive definitions used for verification rather than understanding.

## V2 View Groups

A V2 View Group separates reader-facing title from compiler slot:

```json
{
  "id": "working-model",
  "title": "新方案怎么工作",
  "layer": "understand",
  "slot": "design",
  "items": []
}
```

`title` is reader-facing information scent.

`slot` is a bounded compiler/layout vocabulary used by the current renderer:

- `overview`
- `design`
- `decisions`
- `delivery`
- `details`
- `appendix`

Slots are not mandatory chapters. Empty slots do not render.

## Reading budget

Reading Budget remains separate from Content Budget.

| Pressure | First-level groups | Brief information points | Understand presentation nodes |
|---|---:|---:|---:|
| low | <= 3 | <= 5 | <= 5 |
| medium | <= 5 | <= 7 | <= 7 |
| high | <= 6 | <= 8 | <= 8 |

Count a brief information point as the bottom line, each key change, impact when present, each key risk, and delivery when present.

For V2, presentation nodes are the actual pieces shown to the reader. One semantic Block may contribute multiple nodes when each adds distinct reading value.

If the solution needs more engineering detail than the reading budget allows, move it to Implement/Reference. Do not delete material engineering detail merely to satisfy a first-read budget.

## Information scent

Reader-facing group names should tell the reader why they would open the group.

Good:

- 这次到底改变了什么
- 新方案怎么工作
- 为什么这样设计
- 怎么安全上线并证明可恢复
- 实施时再看这些细节
- 依据与待确认

Avoid exposing internal taxonomy directly as a long first-level list:

- 背景
- 架构
- 流程
- 接口
- 数据
- 非功能
- 风险
- 测试
- 灰度

Those remain technical semantics in the Model and may be composed into fewer reader questions.

## Signal-to-noise

- Do not repeat the same conclusion in the brief, paragraph, card, table and diagram unless each occurrence adds a distinct role.
- If a diagram communicates topology/order, surrounding prose should explain rationale, boundary, exception or consequence rather than narrating every edge.
- Evidence IDs are machine metadata; show human-readable evidence text and keep raw IDs as metadata.
- Block `reason` explains why the semantic Block exists to the generator/reviewer. It is not reader-facing body copy.

## Multiple presentations

V2 intentionally allows one semantic Block to have several Presentation Nodes.

Good example:

```text
Architecture Block
  ├─ architecture diagram → relationships/boundaries
  └─ short text → the one failure-isolation consequence the reader must remember
```

Bad example:

```text
Architecture Block
  ├─ diagram
  ├─ paragraph narrating every edge
  ├─ table repeating the same components
  └─ cards repeating the same conclusion
```

Every additional Presentation Node must add a different reading job.

## Narrative planning steps

After the Solution Model is selected and before representation is finalized:

1. write/refresh the BLUF brief;
2. identify the smallest set of reader questions needed for Understand;
3. place implementation-specific material into Implement;
4. move Evidence/reference material into Reference;
5. assign stable narrative slots for the current renderer;
6. remove duplicate exposition;
7. only then select Presentation Nodes;
8. verify that the Understand path answers why / what / how / main trade-off / delivery risk as needed.

The Narrative Planner must not invent technical facts or components. It changes exposure order and presentation depth only.

## V1 compatibility

SchemaVersion `0.1` continues to use Block-level `reading.role` and `reading.group` metadata.

Those fields are a compatibility runtime mechanism, not the preferred V2 authoring model.

For new V2 solutions, keep reading metadata exclusively in `view.groups[]` and let the compiler derive V1 runtime placement when needed.
