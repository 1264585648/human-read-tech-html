# Archify Adapter Contract

Archify is the preferred diagram engine for architecture, sequence, workflow, data-flow and lifecycle diagrams.

## Boundary

Human Read Tech HTML owns:

- whether a diagram exists;
- the diagram type;
- semantic scope and node set;
- why the diagram is necessary;
- source freshness checks before embedding a compiled artifact.

Archify owns:

- typed diagram schema validation;
- layout and routing;
- polished HTML/SVG viewer output;
- deterministic delivery checks.

Do not copy Archify renderer/validator internals into this repository.

## `solution.json`

For an Archify representation, `representation.spec` is the Archify typed JSON source itself.

## Build integration

Run:

```bash
node bin/hrth.mjs diagrams solution.json .hrth/diagrams
```

The exporter writes each typed source plus `manifest.json`. Every diagram entry contains a SHA-256 `sourceHash` derived from the current `representation.spec`.

When a Block's `sourceHash` changes, exporting that diagram removes the previous `<block-id>.html` and `<block-id>.receipt.json`. If the hash is unchanged, the valid compiled artifact is preserved for incremental builds.

A calling Agent with Archify installed should:

1. read the matching source file and `sourceHash` from `manifest.json`;
2. run Archify `validate` / `deliver` using the matching type;
3. save the delivered HTML as `<diagram-dir>/<block-id>.html`;
4. optionally save `<diagram-dir>/<block-id>.receipt.json` after successful validation/delivery;
5. run `hrth render solution.json solution.html --diagram-dir <diagram-dir>`.

Recommended receipt shape:

```json
{
  "sourceHash": "<manifest sourceHash>",
  "compiler": "archify",
  "compilerVersion": "<version>",
  "validated": true
}
```

When rendering with `--diagram-dir`, Human Read Tech HTML compares the current `representation.spec` hash with the manifest. A hash mismatch, missing artifact, or invalid receipt causes an honest semantic fallback instead of embedding the questionable HTML.

The embedded diagram iframe uses `sandbox="allow-scripts"` without `allow-same-origin`, and `referrerpolicy="no-referrer"`, so interactive diagram JavaScript remains isolated from the parent technical-solution page.

If no precompiled artifact exists, Human Read Tech HTML renders a semantic fallback for architecture/sequence so the report remains readable without pretending Archify validation occurred.
