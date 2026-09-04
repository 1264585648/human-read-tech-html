# External References and Integration Boundaries

V1 intentionally integrates ideas and typed artifacts without copying large renderer or template implementations.

| Project / Method | V1 use | Boundary |
|---|---|---|
| tt-a1i/archify | primary architecture/sequence/workflow/dataflow/lifecycle renderer | external adapter; keep Archify typed source in `solution.json`, do not vendor renderer internals |
| mermaid-js/mermaid | ER/Gantt fallback | secondary build-time renderer; no CDN dependency in core HTML |
| C4 / Structurizr | architecture depth semantics | reasoning/reference only; do not force all C4 levels |
| MADR | lightweight decision semantics | use Context → Options → Decision → Consequences only when a real choice exists |
| arc42 | completeness inspiration | review checklist only; do not copy or force the full template |
| pinchen147/system-design-skill | anti-overengineering and simplest-viable-design inspiration | reasoning reference, not runtime dependency |

License notes should be rechecked before vendoring any future code. V1 avoids vendoring these projects and therefore keeps runtime ownership and upgrade boundaries explicit.
