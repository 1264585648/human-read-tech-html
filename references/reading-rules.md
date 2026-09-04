# Reading Rules

The solution model is written for machines and agents; the final artifact is written for people. Do not expose the internal Block list as the reader's chapter list.

## Design laws

1. **Decision usefulness over completeness.** Include only information that changes implementation, review, rollout, verification, or an important decision.
2. **Bottom line before background.** State the proposed solution before long context or analysis.
3. **Progressive disclosure over full exposure.** A reader should be able to stop after 30 seconds, 3 minutes, or continue into implementation details without losing coherence.
4. **Blocks are semantic units, not chapters.** Blocks may be regrouped, nested, collapsed, or moved to an appendix without changing their technical meaning.
5. **Group by reader questions, not data types.** Prefer "方案怎么工作" over a flat sequence such as "接口 / 数据 / 非功能".
6. **Conclusion → reasons → evidence.** Lead with the decision or design conclusion, then explain why, then expose proof or source material.
7. **One view, one main story.** A section, table, card group, or diagram should have one dominant purpose.
8. **Complexity may increase depth, not first-read burden.** High-pressure systems may contain more detail, but the first read must stay bounded.

These rules intentionally borrow the useful parts of BLUF / inverted-pyramid writing, the Minto Pyramid Principle, progressive disclosure, information scent, chunking, C4-style zoom levels, signal-to-noise reduction, and lightweight MADR decision writing. Do not import their full templates.

## Three reading depths

### Scan — about 30 seconds

The first screen must answer:

- what are we proposing;
- what changes materially;
- what is affected;
- what are the biggest risks or constraints;
- how will it be rolled out / verified when that matters.

Use `brief` for this layer. It is a compact index of the solution, not a second copy of the body.

### Understand — about 3 minutes

A reviewer should understand the core design and the most challengeable decision without opening implementation details.

Default groups:

- `overview` → **先看结论**
- `design` → **方案怎么工作**
- `decisions` → **为什么这样设计**
- `delivery` → **如何安全上线**

Only groups that contain material content should appear.

### Implement — on demand

Implementation-specific material belongs under:

- `details` → **实现细节**
- `appendix` → **依据与附录**

Typical detail/reference material includes exhaustive interfaces, storage fields, operational thresholds, secondary flows, test matrices, evidence, assumptions, unknowns, and research sources.

## Reading roles

Each Block may declare:

- `core` — required to understand the solution on the first serious read;
- `detail` — required for implementation or deep review, but not for the first pass;
- `reference` — consulted only to verify evidence, assumptions, unknowns, or exhaustive definitions.

`importance` and `reading.role` are different:

- `importance` asks whether the information matters technically;
- `reading.role` asks when the reader needs to see it.

A technically high-importance interface contract can still be `detail`.

## Default planning hints

These are defaults, not fixed mappings:

| Block type | Default role | Default group |
|---|---|---|
| summary / context / goals / change_set | core | overview |
| architecture / primary flow | core | design |
| decisions | core | decisions |
| rollout / verification / material risks | core | delivery |
| interfaces | detail | details |
| data | detail | details |
| non_functional | detail | details |
| evidence / assumptions / unknowns | reference | appendix |

Promote detail to core when it is the load-bearing subject of the change. Examples:

- database migration → `data` may be `core/design`;
- API compatibility project → `interfaces` may be `core/design`;
- performance/capacity project → `non_functional` may be `core/design`;
- call-chain correctness project → the relevant `flow` / `interfaces` may be `core/design`.

## Reading budget

Reading budget is separate from content budget.

| Pressure | First-level groups | Brief information points | Core Blocks |
|---|---:|---:|---:|
| low | <= 3 | <= 5 | <= 5 |
| medium | <= 5 | <= 7 | <= 7 |
| high | <= 6 | <= 8 | <= 8 |

Count a brief information point as the bottom line, each key change, impact when present, each key risk, and delivery when present.

If the solution needs more information than the reading budget allows, move it deeper. Do not delete material engineering detail just to satisfy a first-read budget.

## Information scent

First-level group names should tell the reader why they would open the group. Prefer question/decision-oriented labels over internal taxonomy.

Good:

- 先看结论
- 方案怎么工作
- 为什么这样设计
- 如何安全上线
- 实现细节
- 依据与附录

Avoid exposing a long first-level sequence such as:

- 背景
- 架构
- 流程
- 接口
- 数据
- 非功能
- 风险
- 测试
- 灰度

Those may remain Blocks internally, but they should be composed into a smaller reading structure.

## Signal-to-noise

- Do not repeat the same conclusion in summary text, cards, body text, and a diagram.
- If a diagram already communicates topology/order, prose should explain the reason, boundary, or exception rather than narrate every edge again.
- Evidence IDs are machine metadata; show human-readable evidence text in the reading flow and keep raw IDs as metadata.
- Block `reason` explains why the Block exists to the generator/reviewer. It is not reader-facing body content and should not be rendered as a repeated paragraph.

## Narrative Planner

After semantic Blocks are selected and before representation is finalized:

1. write/refresh the BLUF `brief` from the chosen solution;
2. assign each Block a reading `role` and `group`;
3. keep the number of first-level groups within the reading budget;
4. promote only load-bearing detail to `core`;
5. move evidence/reference material to `appendix`;
6. remove obvious duplicate exposition;
7. verify that the first three visible groups answer why, what, how, and the main trade-off/risk.

The Narrative Planner must not invent technical facts or new components. It only changes exposure order and presentation depth.
