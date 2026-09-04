# Scoping Rules

Use these rules before producing a full technical solution.

## Six pressure dimensions

Assess each as `low`, `medium`, or `high`:

- change scope
- data change
- call-chain complexity
- business risk
- performance/capacity impact
- technical uncertainty

Do not mechanically sum a numeric score. A single load-bearing `high` dimension may justify deeper design even when the other dimensions are low.

## Anti-overdesign gate

Prefer a minimal solution when all of the following are true:

- change stays inside one component or one well-understood boundary;
- topology does not materially change;
- no new consistency, durability, security, capacity, or compliance problem is introduced;
- an existing team pattern or recorded decision already constrains the answer;
- a short explanation plus one or two structured change tables is enough to implement without ambiguity.

When this gate closes the full-design path, do not manufacture diagrams, architecture alternatives, or non-functional sections.

## Content budgets

Budgets are ceilings, never quotas.

| Pressure | Diagrams | Tables | Blocks |
|---|---:|---:|---:|
| low | 0–1 | 0–2 | 3–6 |
| medium | 0–3 | 1–4 | 5–9 |
| high | as needed | as needed | as needed, still simplified |

## Earn every block

A block may enter only if at least one is true:

1. removing it creates implementation ambiguity;
2. removing it hides a material trade-off or risk;
3. removing it weakens rollout, rollback, or verification;
4. removing it loses rationale future maintainers will need.

Every included block must record its `reason`.
