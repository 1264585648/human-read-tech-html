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
const REQUIRED_DIMENSIONS = [
  'changeScope','dataChange','callChain','businessRisk','performanceCapacity','technicalUncertainty'
];
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

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

function validateId(value, code, label, errors, blockId = null) {
  if (!nonEmpty(value)) {
    errors.push(finding(code, 'error', `${label} is required.`, blockId));
    return false;
  }
  if (!ID_PATTERN.test(value)) {
    errors.push(finding(`${code}.format`, 'error', `${label} must match ^[a-z0-9][a-z0-9_-]*$.`, blockId));
    return false;
  }
  return true;
}

function validateArchifyReferences(rep, errors, blockId) {
  const spec = rep?.spec;
  if (!isObject(spec)) return;

  if (rep.kind === 'architecture') {
    const components = Array.isArray(spec.components) ? spec.components : [];
    const ids = new Set();
    for (const component of components) {
      if (!isObject(component) || !nonEmpty(component.id)) continue;
      if (ids.has(component.id)) errors.push(finding('archify.component.duplicate', 'error', `Duplicate architecture component id: ${component.id}`, blockId));
      ids.add(component.id);
    }
    for (const edge of spec.connections ?? []) {
      if (!isObject(edge)) continue;
      if (!ids.has(edge.from)) errors.push(finding('archify.connection.from', 'error', `Architecture connection references unknown component: ${edge.from}`, blockId));
      if (!ids.has(edge.to)) errors.push(finding('archify.connection.to', 'error', `Architecture connection references unknown component: ${edge.to}`, blockId));
    }
    for (const boundary of spec.boundaries ?? []) {
      if (!isObject(boundary) || !Array.isArray(boundary.wraps)) continue;
      for (const id of boundary.wraps) {
        if (!ids.has(id)) errors.push(finding('archify.boundary.wraps', 'error', `Architecture boundary references unknown component: ${id}`, blockId));
      }
    }
  }

  if (rep.kind === 'sequence') {
    const participants = Array.isArray(spec.participants) ? spec.participants : [];
    const ids = new Set();
    for (const participant of participants) {
      if (!isObject(participant) || !nonEmpty(participant.id)) continue;
      if (ids.has(participant.id)) errors.push(finding('archify.participant.duplicate', 'error', `Duplicate sequence participant id: ${participant.id}`, blockId));
      ids.add(participant.id);
    }
    for (const message of spec.messages ?? []) {
      if (!isObject(message)) continue;
      if (!ids.has(message.from)) errors.push(finding('archify.message.from', 'error', `Sequence message references unknown participant: ${message.from}`, blockId));
      if (!ids.has(message.to)) errors.push(finding('archify.message.to', 'error', `Sequence message references unknown participant: ${message.to}`, blockId));
    }
  }
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
    if (!isObject(scoping.dimensions)) {
      errors.push(finding('scoping.dimensions.required', 'error', 'All six scoping dimensions are required.'));
    } else {
      for (const key of REQUIRED_DIMENSIONS) {
        if (!PRESSURE.has(scoping.dimensions[key])) errors.push(finding('scoping.dimension.required', 'error', `Missing or invalid scoping dimension: ${key}.`));
      }
      for (const [key, level] of Object.entries(scoping.dimensions)) {
        if (!REQUIRED_DIMENSIONS.includes(key)) warnings.push(finding('scoping.dimension.unknown', 'warning', `Unknown scoping dimension: ${key}.`));
        else if (!PRESSURE.has(level)) errors.push(finding('scoping.dimension', 'error', `Invalid pressure level for ${key}.`));
      }
    }
  }

  const evidence = solution.evidence;
  const evidenceIds = new Set();
  if (!isObject(evidence)) {
    errors.push(finding('evidence.required', 'error', 'evidence is required.'));
  } else {
    for (const key of ['facts','assumptions','unknowns']) {
      if (!Array.isArray(evidence[key])) {
        errors.push(finding(`evidence.${key}`, 'error', `evidence.${key} must be an array.`));
        continue;
      }
      for (const item of evidence[key]) {
        if (!isObject(item) || !nonEmpty(item.text)) {
          errors.push(finding(`evidence.${key}.item`, 'error', `Every ${key} item must contain non-empty text.`));
          continue;
        }
        if (validateId(item.id, `evidence.${key}.id`, `Every ${key} item id`, errors)) {
          if (evidenceIds.has(item.id)) errors.push(finding('evidence.id.duplicate', 'error', `Duplicate evidence id: ${item.id}.`));
          evidenceIds.add(item.id);
        }
      }
    }
  }

  if (!Array.isArray(solution.blocks)) {
    errors.push(finding('blocks.required', 'error', 'blocks must be an array.'));
    return { ok: false, errors, warnings };
  }

  const seen = new Set();
  for (const block of solution.blocks) {
    if (!isObject(block)) { errors.push(finding('block.type', 'error', 'Every block must be an object.')); continue; }
    if (validateId(block.id, 'block.id', 'Block id', errors, block.id) && seen.has(block.id)) errors.push(finding('block.id.duplicate', 'error', `Duplicate block id: ${block.id}`, block.id));
    else if (nonEmpty(block.id)) seen.add(block.id);
    if (!BLOCK_TYPES.has(block.type)) errors.push(finding('block.type.invalid', 'error', `Invalid block type: ${block.type}`, block.id));
    if (!PRESSURE.has(block.importance)) errors.push(finding('block.importance', 'error', 'Block importance must be low, medium, or high.', block.id));
    if (!nonEmpty(block.reason)) errors.push(finding('block.reason', 'error', 'Every block must explain why it exists.', block.id));
    if (!Object.prototype.hasOwnProperty.call(block, 'content')) errors.push(finding('block.content.required', 'error', 'Every block must contain content.', block.id));

    if (block.sourceRefs !== undefined) {
      if (!Array.isArray(block.sourceRefs)) errors.push(finding('block.source_refs.type', 'error', 'sourceRefs must be an array.', block.id));
      else for (const ref of block.sourceRefs) {
        if (!nonEmpty(ref) || !evidenceIds.has(ref)) errors.push(finding('block.source_ref.invalid', 'error', `Unknown evidence reference: ${ref}`, block.id));
      }
    }

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
      validateArchifyReferences(rep, errors, block.id);
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

function hasBlockType(blocks, type) {
  return blocks.some(block => block?.type === type);
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
    if (block.type === 'non_functional' && dims.performanceCapacity === 'low' && dims.businessRisk === 'low') findings.push(finding('overdesign.non_functional', 'warning', 'Non-functional block may be unnecessary for a low-risk change.', block.id));
    if (DIAGRAM_KINDS.has(block?.representation?.kind) && primaryNodeCount(block) > 12) findings.push(finding('diagram.density', 'warning', 'Diagram has more than 12 primary nodes; remove unrelated nodes or explain why density is necessary.', block.id));
  }

  if (dims.businessRisk === 'high' && !hasBlockType(blocks, 'verification')) {
    findings.push(finding('completeness.verification', 'warning', 'High business risk requires an explicit verification plan.'));
  }
  if ((dims.businessRisk === 'high' || dims.changeScope === 'high' || dims.dataChange === 'high') && !hasBlockType(blocks, 'rollout')) {
    findings.push(finding('completeness.rollout', 'warning', 'This change likely needs explicit rollout and rollback coverage.'));
  }
  if (dims.callChain === 'high' && !blocks.some(block => ['flow','architecture','interfaces'].includes(block.type))) {
    findings.push(finding('completeness.call_chain', 'warning', 'High call-chain pressure needs an explicit flow, architecture, or interface boundary description.'));
  }
  if (dims.dataChange === 'high' && !hasBlockType(blocks, 'data')) {
    findings.push(finding('completeness.data', 'warning', 'High data-change pressure needs explicit data, migration, or consistency coverage.'));
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
