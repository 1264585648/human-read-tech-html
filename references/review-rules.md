# Review and Simplification Rules

Run review after `solution.json` is complete and before final handoff.

## Completeness

Review only what the selected scope requires. Do not compare the document against a ceremonial fixed chapter list.

Check that goals, change set, relevant boundaries/data/calls, risks, verification, rollout and rollback are sufficiently clear for this change.

## Consistency

- prose and diagrams use the same component names;
- interface fields and message names are stable across blocks;
- before/after statements are not contradictory;
- decision rationale follows from facts, constraints, or explicit assumptions.

## Evidence

- facts are supported by user input, repository evidence, or verified external evidence;
- assumptions remain labelled assumptions;
- unknowns are not silently converted into facts;
- a material unknown prevents unjustified `high` confidence.

## Overdesign deletion rules

Delete by default when:

- `importance` is `low`;
- a local change has an architecture diagram but no meaningful topology/call-chain change;
- a decision block has fewer than two live alternatives;
- a diagram communicates no more than a short table/paragraph;
- nodes are unrelated to the changed path;
- the same fact is repeated in summary, cards, body and diagram.

Automated simplification must remain conservative: remove only deterministic low-value blocks and write a new JSON file rather than mutating the source in place.
