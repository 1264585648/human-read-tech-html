# Representation Rules

Choose content first, reading depth second, representation third.

The same technical information may deserve a different presentation depending on whether it is `core`, `detail`, or `reference` material. Do not let a rich representation promote low-priority detail into the main reading flow.

## Routing

| Meaning | Default representation |
|---|---|
| simple fact or rationale | text |
| structured fields, impacts, risks, contracts | table |
| a few parallel conclusions | cards |
| components, services, boundaries | architecture |
| ordered calls across participants | sequence |
| steps with branches or operational procedure | workflow |
| source → transform → store → consumer | dataflow |
| state, retry, wait, terminal | lifecycle |
| entity/table relationships | ER |
| meaningful project-time dependencies | Gantt |

## Reading-depth gate

Before choosing a representation, confirm the Block's reading role from `references/reading-rules.md`.

- `core`: optimize for fast comprehension and the main decision story;
- `detail`: optimize for implementation lookup; it may be collapsed by default;
- `reference`: optimize for verification and completeness, usually in the appendix.

A large table or rich diagram does not become `core` merely because it is useful. Reading priority is decided by whether the reader needs it to understand the solution.

## Diagram gate

Generate a diagram only when it communicates a relationship, order, branch, boundary, or data movement materially better than prose/table.

If 3–5 sentences or a small table is equally clear, do not draw.

If a diagram already communicates topology or order, surrounding prose should explain rationale, boundary, exception, or consequence instead of narrating every edge again.

## Diagram engines

- Archify: `architecture`, `sequence`, `workflow`, `dataflow`, `lifecycle`.
- Mermaid fallback: `er`, `gantt`, and other deliberately simple secondary diagrams.

The Skill chooses whether a diagram is needed. The diagram engine must never expand topology on its own.

## Density

- one diagram = one main story;
- target 5–10 primary nodes;
- >12 primary nodes requires a real reason;
- preserve semantic edge labels when they affect correctness;
- remove unrelated infrastructure rather than shrinking everything to fit;
- do not mix overview, component internals, and implementation details in one diagram merely for completeness.

This borrows the useful zoom-level idea from C4 without requiring a fixed C4 document hierarchy.
