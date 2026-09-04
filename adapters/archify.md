# Archify Adapter Contract

Archify is the preferred diagram engine for architecture, sequence, workflow, data-flow and lifecycle diagrams.

## Boundary

Human Read Tech HTML owns:

- whether a diagram exists;
- the diagram type;
- semantic scope and node set;
- why the diagram is necessary.

Archify owns:

- typed diagram schema validation;
- layout and routing;
- polished HTML/SVG viewer output;
- deterministic delivery checks.

Do not copy Archify renderer/validator internals into this repository.

## `solution.json`

For an Archify representation, `representation.spec` is the Archify typed JSON source itself.

## Build integration

The core renderer accepts `--diagram-dir <dir>`. If `<dir>/<block-id>.html` exists, that trusted diagram HTML is embedded into the final standalone solution page via `iframe srcdoc`.

A calling Agent with Archify installed should:

1. extract the block's `representation.spec` to a temporary JSON file;
2. run Archify `validate`/`deliver` using the matching type;
3. save the delivered HTML as `<diagram-dir>/<block-id>.html`;
4. run `hrth render solution.json solution.html --diagram-dir <diagram-dir>`.

If no precompiled artifact exists, Human Read Tech HTML renders a semantic fallback for architecture/sequence so the report remains readable without pretending Archify validation occurred.
