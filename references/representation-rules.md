# Representation Rules

Choose content first, representation second.

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

## Diagram gate

Generate a diagram only when it communicates a relationship, order, branch, boundary, or data movement materially better than prose/table.

If 3–5 sentences or a small table is equally clear, do not draw.

## Diagram engines

- Archify: `architecture`, `sequence`, `workflow`, `dataflow`, `lifecycle`.
- Mermaid fallback: `er`, `gantt`, and other deliberately simple secondary diagrams.

The Skill chooses whether a diagram is needed. The diagram engine must never expand topology on its own.

## Density

- one diagram = one main story;
- target 5–10 primary nodes;
- >12 primary nodes requires a real reason;
- preserve semantic edge labels when they affect correctness;
- remove unrelated infrastructure rather than shrinking everything to fit.
