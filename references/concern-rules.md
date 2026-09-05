# Concern Rules

Concern is a set of engineering questions that becomes relevant because of the change, not a document chapter.

The purpose of Concern Packs is to move review from **chapter completeness** to **question completeness**.

## Core rule

Do not ask "does this solution have a data / security / cache / MQ section?".

Ask "for the concerns activated by this change, have the load-bearing engineering questions been answered, explicitly marked unknown, or shown to be not applicable?".

A concern answer has three states:

- `answered` — the design contains an answer and points to semantic Blocks and/or Evidence;
- `unknown` — the question matters but is not yet resolved;
- `not_applicable` — the question was considered and does not apply to this change.

Never convert `unknown` into `answered` merely to make review green.

## Built-in packs

V2 ships with four initial packs:

- `async-messaging` — delivery semantics, idempotency, ordering, ACK boundary, retry/DLQ, isolation, observability and capacity;
- `cache` — key design, TTL/staleness, invalidation, penetration, breakdown, avalanche, consistency and capacity;
- `data-migration` — compatibility, expand/contract, backfill, dual-write, cutover, verification, rollback and capacity;
- `external-api` — contract, timeout, retry, rate limit, degradation, security, versioning and observability.

Packs live under `concerns/*.json`. They are intentionally question sets, not templates and not Block definitions.

## Activation

The Agent activates only concerns materially present in the change.

Examples:

- introducing Kafka or moving work across an event boundary → `async-messaging`;
- adding Redis or another read/write cache → `cache`;
- schema migration, backfill, dual-write or storage cutover → `data-migration`;
- adding or materially changing a third-party dependency → `external-api`.

Do not activate every pack for completeness.

## Traceability

An `answered` question should normally point to one or more:

- `blockRefs` — where the technical answer lives in the Solution Model;
- `evidenceRefs` — facts/assumptions/unknowns that support or constrain the answer.

This gives the review engine a deterministic way to surface untraceable answers while leaving semantic judgement to the Agent/human reviewer.

## Relationship to Narrative

Concern Packs do **not** directly create first-level sections.

Several concern answers may be expressed inside the same reader-facing group, table, cards, diagram annotation, implementation detail or appendix item.

The Narrative Planner decides where the reader needs the answer. The Concern layer only decides whether the question must be addressed.
