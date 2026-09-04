# Review and Simplification Rules

Run review after `solution.json` is complete and before final handoff.

## Completeness

Review only what the selected scope requires. Do not compare the document against a ceremonial fixed chapter list.

Check that goals, change set, relevant boundaries/data/calls, risks, verification, rollout and rollback are sufficiently clear for this change.

Deterministic minimum checks:

- `businessRisk=high` requires an explicit `verification` block;
- high business risk, high change scope, or high data change should have explicit `rollout` / rollback coverage;
- `callChain=high` needs at least one explicit `flow`, `architecture`, or `interfaces` boundary description;
- `dataChange=high` needs explicit `data` / migration / consistency coverage.

These checks are warnings rather than a fixed template mandate. A justified exception may remain, but it must be visible during review.

## Consistency

- prose and diagrams use the same component names;
- interface fields and message names are stable across blocks;
- before/after statements are not contradictory;
- decision rationale follows from facts, constraints, or explicit assumptions;
- Archify architecture connections and boundaries reference declared components;
- Archify sequence messages reference declared participants.

## Evidence

- facts are supported by user input, repository evidence, or verified external evidence;
- every evidence item has a stable `id`;
- blocks use `sourceRefs` when a conclusion materially depends on specific evidence;
- every `sourceRefs` entry must resolve to an existing evidence id;
- assumptions remain labelled assumptions;
- unknowns are not silently converted into facts;
- a material unknown prevents unjustified `high` confidence.

## Readability

Apply `references/reading-rules.md` before handoff.

The review asks whether a normal reader can consume the same solution at three depths without being forced through the full internal Block model.

Deterministic checks:

- medium/high pressure should provide a BLUF `brief` rather than relying only on a generic summary;
- medium/high pressure should normally provide explicit `reading.role` and `reading.group` metadata for Blocks;
- first-level reading groups must stay within the Reading Budget;
- `core` Blocks must stay within the first-read budget;
- the first-screen `brief` must stay within its information-point budget;
- when every Block is `core`, progressive disclosure is probably not working;
- `reference` material should normally live in `appendix`.

Semantic review prompts:

- does the brief state the selected solution, or merely repeat background;
- can the reader understand why / what / how without opening `details`;
- are interface/data/non-functional details promoted to core only because they are load-bearing for this change;
- does the same conclusion appear in the brief, paragraph, card, table and diagram without adding meaning;
- do first-level group names express reader intent rather than internal taxonomy.

Do not add NLP similarity scoring or another AI review service just to automate the ambiguous checks above. Keep deterministic checks in code and leave semantic judgement to the final agent/human pass.

## Overdesign deletion rules

Delete by default when:

- `importance` is `low`;
- a local change has an architecture diagram but no meaningful topology/call-chain change;
- a decision block has fewer than two live alternatives;
- a low-risk, low-performance-pressure change adds a non-functional block without a material reason;
- a diagram communicates no more than a short table/paragraph;
- nodes are unrelated to the changed path;
- the same fact is repeated in summary, cards, body and diagram.

Automated simplification must remain conservative: remove only deterministic low-value blocks and write a new JSON file rather than mutating the source in place.
