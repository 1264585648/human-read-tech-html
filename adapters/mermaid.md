# Mermaid Adapter Contract

Mermaid is a secondary renderer, not a competing default architecture engine.

Use it when Archify is not the natural semantic fit, especially:

- ER diagrams;
- Gantt diagrams;
- deliberately simple secondary diagrams.

Store source in `representation.spec.source`.

The V1 self-contained renderer does not load Mermaid from a CDN. If Mermaid has not been precompiled to an artifact, the final HTML shows the typed source honestly rather than depending on network access or claiming a rendered diagram exists.

A future adapter may compile Mermaid to SVG during build and embed the SVG directly. This must not change `solution.json` as the source of truth.
