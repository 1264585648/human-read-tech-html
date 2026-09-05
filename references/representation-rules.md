# Representation Rules

Choose technical semantics first, reading depth second, presentation third.

V2 representation belongs to the View layer, not the Solution Model.

## Core rule

A semantic Block answers **what is technically true or selected**.

A Presentation Node answers **how this reader should consume that semantic content at this reading depth**.

Do not let a rich representation promote low-priority implementation detail into the main reading path.

## Routing

| Meaning | Default presentation |
|---|---|
| simple fact, consequence or rationale | text |
| structured fields, impacts, risks, contracts | table |
| a few parallel conclusions | cards |
| components, services, trust/system boundaries | architecture |
| ordered calls across participants | sequence |
| steps with branches or operational procedure | workflow |
| source → transform → store → consumer | dataflow |
| state, retry, wait, terminal | lifecycle |
| entity/table relationships | ER |
| meaningful project-time dependencies | Gantt |

## Reading-depth gate

Before choosing a presentation, confirm the View Group layer:

- `understand`: optimize for fast comprehension and the decision story;
- `implement`: optimize for implementation lookup and precision;
- `reference`: optimize for verification and completeness.

A large table or rich diagram does not become `understand` merely because it contains important engineering detail.

## Multiple Presentation Nodes

One semantic Block may have more than one Presentation Node when each node performs a distinct reading job.

Good:

```text
architecture Block
  ├─ architecture diagram → topology / boundaries
  └─ short paragraph → failure-isolation consequence
```

Good:

```text
rollout Block
  ├─ short Understand summary → rollout principle
  └─ detailed Implement table → stages / gates / rollback triggers
```

Bad:

```text
architecture Block
  ├─ architecture diagram
  ├─ table listing the same components
  └─ paragraph narrating every edge
```

Additional Presentation Nodes must add distinct information value, not merely restyle the same content.

## Diagram gate

Generate a diagram only when it communicates relationship, order, branch, boundary, state or data movement materially better than prose/table.

If 3–5 sentences or a compact table is equally clear, do not draw.

If a diagram already communicates topology/order, surrounding prose should explain rationale, boundary, exception or consequence instead of narrating every edge again.

## Diagram engines

Preferred routing remains deterministic:

- Archify: `architecture`, `sequence`, `workflow`, `dataflow`, `lifecycle`;
- Mermaid: `er`, `gantt`, and deliberately simple secondary diagrams.

The View Planner chooses whether a diagram exists and what semantic scope it contains. The diagram engine must not invent topology.

## Density

- one diagram = one main story;
- target 5–10 primary nodes;
- >12 primary nodes requires a real reason;
- preserve semantic edge labels when they affect correctness;
- remove unrelated infrastructure rather than shrinking everything to fit;
- do not mix system overview, component internals and implementation details in one diagram merely for completeness.

## Content ownership

Prefer source content in the semantic Model when it expresses technical truth that should survive across Views.

Use Presentation-level `content` only when the wording or structure is specifically for that View, for example:

- a short boundary statement next to a diagram;
- a compact executive explanation derived from a deeper semantic Block;
- an implementation-specific table view over the same semantic content.

Do not duplicate authoritative technical facts across several Presentation `content` payloads when they can remain stable in the Model.

## V1 compatibility

SchemaVersion `0.1` stores `representation` on Blocks. This remains supported by the runtime.

For schemaVersion `0.2`, keep representation exclusively under:

```text
view.groups[].items[].presentations[]
```

The V2 compiler derives the legacy runtime representation only for compatibility with the current renderer and diagram pipeline.
