# Review and Simplification Rules

Run review after the semantic Solution Model and human View Plan are complete and before handoff.

V2 review has six responsibilities:

1. structural validity;
2. question completeness through Concern Packs;
3. technical completeness for the selected scope;
4. Evidence consistency and traceability;
5. readability / progressive disclosure;
6. overdesign removal.

## 1. Structural validity

For schemaVersion `0.2`:

- Model Blocks must not contain `reading` or `representation`;
- every `view.items[].blockRef` must resolve to a semantic Block;
- every diagram Presentation must contain a typed spec;
- presentation ids must remain stable when they back compiled diagram artifacts;
- Concern Packs must exist;
- Concern `blockRefs` / `evidenceRefs` must resolve;
- compiled V1 runtime output must still pass existing validator rules.

## 2. Question completeness through Concerns

Do not ask whether the document contains ceremonial chapters.

Ask whether activated engineering concerns have been addressed.

For each Concern question:

- `answered` — should normally point to Block and/or Evidence refs;
- `unknown` — remains visible as a material unresolved item;
- `not_applicable` — explicitly considered and intentionally excluded.

Review warnings should surface:

- unanswered questions;
- answered questions with no traceable Block/Evidence;
- material unknowns that still affect design or delivery.

Do not manufacture an answer merely to eliminate the warning.

## 3. Technical completeness

Review only what the selected scope requires.

Existing deterministic minimum checks remain useful after V2 compilation:

- `businessRisk=high` requires explicit verification coverage;
- high business risk, high change scope or high data change should include rollout/rollback coverage;
- `callChain=high` needs an explicit flow, architecture or contract boundary description;
- `dataChange=high` needs explicit migration / consistency / data coverage.

These are prompts, not a fixed chapter mandate.

## 4. Consistency and Evidence

Check that:

- prose and diagrams use the same component/service/message names;
- interface fields and state names remain stable across views;
- before/after statements do not conflict;
- Decision rationale follows facts, constraints or explicit assumptions;
- diagram references point to declared nodes/participants;
- facts remain supported by user/repository/verified sources;
- assumptions remain assumptions;
- unknowns are not silently promoted to facts;
- a material unknown prevents unjustified high confidence;
- semantic Blocks use `sourceRefs` when their conclusion materially depends on specific Evidence.

## 5. Readability

Apply `references/reading-rules.md`.

### Scan

The first screen should state the selected solution, not merely restate background.

Check:

- one clear bottom line;
- only load-bearing changes;
- useful impact boundary;
- material risks;
- rollout/verification conclusion when relevant.

### Understand

A normal reviewer should understand the design without opening implementation details.

Check:

- first-level group titles express reader questions;
- number of Understand groups stays bounded;
- Understand presentation nodes stay within the reading budget;
- a Block is not promoted simply because it is technically important;
- the first serious read explains why / what / how / key trade-off / delivery risk as needed.

### Implement / Reference

Check that deep implementation and Evidence material remains available but does not dominate the first pass.

## 6. Presentation quality

Review each Presentation Node for a distinct reading job.

Delete or merge when:

- a diagram communicates no more than a short paragraph/table;
- a paragraph narrates a diagram edge-by-edge;
- cards/table/text repeat the same conclusion without additional meaning;
- a Presentation exists only to make the page look richer;
- a diagram mixes unrelated zoom levels or includes unchanged infrastructure for completeness.

Good multiple-presentation pattern:

```text
Diagram → relationship / order / boundary
Text → rationale / consequence / exception
Table → implementation contract / exhaustive lookup
```

## 7. Overdesign deletion rules

Delete by default when:

- semantic `importance=low` and removing it loses no important decision/risk/implementation clarity;
- a local change adds an architecture diagram without topology/call-chain value;
- a Decision has fewer than two live options;
- low-risk/low-performance change adds non-functional material with no load-bearing concern;
- unrelated nodes appear in a diagram;
- the same fact is repeated in brief, cards, body and diagram.

For V2, automated simplification should eventually operate on both Model and View. Until that logic is explicitly implemented, do not silently mutate V2 source. Prefer review warnings and deliberate edits.

## 8. Golden quality

A Golden Case should represent an output we want to generate, not a knowingly incomplete artifact used only to exercise fallbacks.

Keep legacy/failure fixtures separate from quality Golden cases where practical.

For V2 Golden cases, prefer:

- valid Model/View separation;
- no unanswered activated concerns unless the example intentionally demonstrates an honest material unknown;
- explicit brief;
- bounded Understand path;
- multiple presentations only where each adds distinct value;
- no stale diagram artifacts;
- zero avoidable readability warnings.

## V1 compatibility

The existing V1 `reviewSolution()` remains part of the compiled-runtime review path.

V2 adds Concern/View checks before and around that legacy review rather than discarding proven deterministic validation immediately.
