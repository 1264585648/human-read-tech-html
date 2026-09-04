const PRESSURE = new Set(['low', 'medium', 'high']);
const BLOCK_TYPES = new Set([
  'summary','context','goals','change_set','architecture','flow','interfaces','data',
  'decisions','non_functional','rollout','verification','risks'
]);
const REPRESENTATIONS = new Set([
  'text','table','cards','architecture','sequence','workflow','dataflow','lifecycle','er','gantt'
]);
const ENGINES = new Set(['native','archify','mermaid','none']);
const DIAGRAM_KINDS = new Set(['architecture','sequence','workflow','dataflow','lifecycle','er','gantt']);
const ARCHIFY_KINDS = new Set(['architecture','sequence','workflow','dataflow','lifecycle']);
const MERMAID_KINDS = new Set(['er','gantt']);

export const BUDGETS = {
  low: { diagrams: 1, tables: 2, blocks: 6 },
  medium: { diagrams: 3, tables: 4, blocks: 9 },
  high: { diagrams: Infinity, tables: Infinity, blocks: Infinity }
};

function finding(code, severity, message, blockId = null) {
  return { code, severity, message, ...(blockId ? { blockId } : {}) };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function countRepresentations(solution) {
  const blocks = Array.isArray(solution?.blocks) ? solution.blocks : [];
  let diagrams = 0;
  let tables = 0;
  for (const block of blocks) {
    const kind = block?.representation?.kind;
    if (DIAGRAM_KINDS.has(kind)) diagrams += 1;
    if (kind === 'table') tables += 1;
  }
  return { blocks: blocks.length, diagrams, tables };
}

export function validateSolution(solution) {
  const errors = [];
  const warnings = [];
  if (!isObject(solution)) return { ok: false, errors: [finding('root.type', 'error', 'Solution must be an object.')], warnings };
  if (solution.schemaVersion !== '0.1') errors.push(finding('schema.version', 'error', 'schemaVersion must be "0.1".'));
  if (!nonEmpty(solution.title)) errors.push(finding('title.required', 'error', 'title is required.'));

  const scoping = solution.scoping;
  if (!isObject(scoping)) {
    errors.push(finding('scoping.required', 'error', 'scoping is required.'));
  } else {
    if (typeof scoping.fullDesignRequired !== 'boolean') errors.push(finding('scoping.fullDesignRequired', 'error', 'scoping.fullDesignRequired must be boolean.'));
    if (!PRESSURE.has(scoping.pressure)) errors.push(finding('scoping.pressure', 'error', 'scoping.pressure must be low, medium, or high.'));
    if (!Array.isArray(scoping.reasons) || scoping.reasons.length === 0) errors.push(finding('scoping.reasons', 'error', 'scoping.reasons must contain at least one reason.'));
    if (isObject(scoping.dimensions)) {
      for (const [key, level] of Object.entries(scoping.dimensions)) {
        if (!PRESSURE.has(level)) errors.push(finding('scoping.dimension', 'error', `Invalid pressure level for ${key}.`));
      }
    }
  }

  const evidence = solution.evidence;
  if (!isObject(evidence)) {
    errors.push(finding('evidence.required', 'error', 'evidence is required.'));
  } else {
    for (const key of ['facts','assumptions','unknowns']) {
      if (!Array.isArray(evidence[key])) errors.push(finding(`evidence.${key}`, 'error', `evidence.${key} must be an array.`));
      else for (const item of evidence[key]) if (!isObject(item) || !nonEmpty(item.text)) errors.push(finding(`evidence.${key}.item`, 'error', `Every ${key} item must contain non-empty text.`));
    }
  }

  if (!Array.isArray(solution.blocks)) {
    errors.push(finding('blocks.required', 'error', 'blocks must be an array.'));
    return { ok: false, errors, warnings };
  }

  const seen = new Set();
  for (const block of solution.blocks) {
    if (!isObject(block)) { errors.push(finding('block.type', 'error', 'Every block must be an object.')); continue; }
    if (!nonEmpty(block.id)) errors.push(finding('block.id', 'error', 'Block id is required.'));
    else if (seen.has(block.id)) errors.push(finding('block.id.duplicate', 'error', `Duplicate block id: ${block.id}`, block.id));
    else seen.add(block.id);
    if (!BLOCK_TYPES.has(block.type)) errors.push(finding('block.type.invalid', 'error', `Invalid block type: ${block.type}`, block.id));
    if (!PRESSURE.has(block.importance)) errors.push(finding('block.importance', 'error', 'Block importance must be low, medium, or high.', block.id));
    if (!nonEmpty(block.reason)) errors.push(finding('block.reason', 'error', 'Every block must explain why it exists.', block.id));
    const rep = block.representation;
    if (!isObject(rep)) { errors.push(finding('representation.required', 'error', 'representation is required.', block.id)); continue; }
    if (!REPRESENTATIONS.has(rep.kind)) errors.push(finding('representation.kind', 'error', `Unsupported representation kind: ${rep.kind}`, block.id));
    if (!ENGINES.has(rep.engine)) errors.push(finding('representation.engine', 'error', `Unsupported engine: ${rep.engine}`, block.id));
    if (!nonEmpty(rep.reason)) errors.push(finding('representation.reason', 'error', 'Every representation must explain why it is better than a simpler alternative.', block.id));
    if (ARCHIFY_KINDS.has(rep.kind) && rep.engine !== 'archify') warnings.push(finding('router.archify.preferred', 'warning', `${rep.kind} should normally route to Archify.`, block.id));
    if (MERMAID_KINDS.has(rep.kind) && rep.engine !== 'mermaid') warnings.push(finding('router.mermaid.preferred', 'warning', `${rep.kind} should normally route to Mermaid.`, block.id));
    if (['text','table','cards'].includes(rep.kind) && !['native','none'].includes(rep.engine)) warnings.push(finding('router.native.expected', 'warning', `${rep.kind} should normally use the native renderer.`, block.id));
    if (DIAGRAM_KINDS.has(rep.kind) && !isObject(rep.spec)) errors.push(finding('diagram.spec.required', 'error', 'Diagram representations require a typed spec object.', block.id));
    if (rep.engine === 'archify' && isObject(rep.spec)) {
      if (rep.spec.diagram_type !== rep.kind) errors.push(finding('archify.diagram_type', 'error', `Archify spec diagram_type must be ${rep.kind}.`, block.id));
      if (rep.spec.schema_version !== 1 && rep.kind !== 'workflow') warnings.push(finding('archify.schema_version', 'warning', 'Archify diagram specs should use the expected schema version.', block.id));
    }
    if (rep.kind === 'table') {
      const c = block.content;
      if (!isObject(c) || !Array.isArray(c.columns) || !Array.isArray(c.rows)) errors.push(finding('table.shape', 'error', 'Table content requires columns[] and rows[].', block.id));
    }
    if (rep.kind === 'cards') {
      const c = block.content;
      if (!isObject(c) || !Array.isArray(c.cards)) errors.push(finding('cards.shape', 'error', 'Cards content requires cards[].', block.id));
    }
  }

  const pressure = solution.scoping?.pressure;
  if (PRESSURE.has(pressure)) {
    const counts = countRepresentations(solution);
    const budget = BUDGETS[pressure];
    if (counts.blocks > budget.blocks) warnings.push(finding('budget.blocks', 'warning', `${pressure} pressure solution has ${counts.blocks} blocks; budget is ${budget.blocks}. Explain or simplify.`));
    if (counts.diagrams > budget.diagrams) warnings.push(finding('budget.diagrams', 'warning', `${pressure} pressure solution has ${counts.diagrams} diagrams; budget is ${budget.diagrams}. Explain or simplify.`));
    if (counts.tables > budget.tables) warnings.push(finding('budget.tables', 'warning', `${pressure} pressure solution has ${counts.tables} tables; budget is ${budget.tables}. Explain or simplify.`));
  }

  return { ok: errors.length === 0, errors, warnings };
}

function decisionOptionCount(block) {
  const c = block?.content;
  if (isObject(c) && Array.isArray(c.options)) return c.options.length;
  if (isObject(c) && Array.isArray(c.rows)) return c.rows.length;
  return 0;
}

function primaryNodeCount(block) {
  const spec = block?.representation?.spec;
  if (!isObject(spec)) return 0;
  if (Array.isArray(spec.components)) return spec.components.length;
  if (Array.isArray(spec.participants)) return spec.participants.length;
  if (Array.isArray(spec.nodes)) return spec.nodes.length;
  return 0;
}

export function reviewSolution(solution) {
  const validation = validateSolution(solution);
  const findings = [...validation.errors, ...validation.warnings];
  const dims = solution?.scoping?.dimensions ?? {};
  const blocks = Array.isArray(solution?.blocks) ? solution.blocks : [];

  for (const block of blocks) {
    if (block.importance === 'low') findings.push(finding('simplify.low_importance', 'warning', 'Low-importance block should normally be removed before delivery.', block.id));
    if (block.type === 'data' && dims.dataChange === 'low') findings.push(finding('overdesign.data', 'warning', 'Data block exists while data-change pressure is low; confirm it changes implementation or remove it.', block.id));
    if (block.type === 'architecture' && dims.changeScope === 'low' && dims.callChain === 'low') findings.push(finding('overdesign.architecture', 'warning', 'Architecture diagram is likely unnecessary for a local change.', block.id));
    if (block.type === 'decisions' && decisionOptionCount(block) < 2) findings.push(finding('overdesign.decision', 'warning', 'Decision block has fewer than two live options; use rationale text instead.', block.id));
    if (DIAGRAM_KINDS.has(block?.representation?.kind) && primaryNodeCount(block) > 12) findings.push(finding('diagram.density', 'warning', 'Diagram has more than 12 primary nodes; remove unrelated nodes or explain why density is necessary.', block.id));
  }

  const materialUnknowns = (solution?.evidence?.unknowns ?? []).filter(x => x?.material !== false);
  if (materialUnknowns.length && solution?.meta?.confidence === 'high') findings.push(finding('evidence.confidence', 'warning', 'High confidence conflicts with material unknowns; lower confidence or resolve them.'));

  const errors = findings.filter(x => x.severity === 'error');
  const warnings = findings.filter(x => x.severity === 'warning');
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts: countRepresentations(solution),
    pressure: solution?.scoping?.pressure ?? null
  };
}

export function simplifySolution(solution) {
  const clone = structuredClone(solution);
  const removed = [];
  const dims = clone?.scoping?.dimensions ?? {};
  clone.blocks = (clone.blocks ?? []).filter(block => {
    let reason = null;
    if (block.importance === 'low') reason = 'low importance';
    else if (block.type === 'architecture' && dims.changeScope === 'low' && dims.callChain === 'low') reason = 'architecture adds little value to a local change';
    else if (block.type === 'decisions' && decisionOptionCount(block) < 2) reason = 'no real alternative exists';
    if (reason) {
      removed.push({ id: block.id, type: block.type, reason });
      return false;
    }
    return true;
  });
  return { solution: clone, removed };
}
