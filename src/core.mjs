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
const READING_ROLES = new Set(['core','detail','reference']);
const READING_GROUPS = new Set(['overview','design','decisions','delivery','details','appendix']);
const READING_GROUP_ORDER = ['overview','design','decisions','delivery','details','appendix'];
const READING_GROUP_TITLES = {
  overview: '先看结论',
  design: '方案怎么工作',
  decisions: '为什么这样设计',
  delivery: '如何安全上线',
  details: '实现细节',
  appendix: '依据与附录'
};
const REQUIRED_DIMENSIONS = [
  'changeScope','dataChange','callChain','businessRisk','performanceCapacity','technicalUncertainty'
];
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const ROOT_KEYS = new Set(['schemaVersion','title','summary','brief','meta','scoping','evidence','blocks']);
const BRIEF_KEYS = new Set(['bottomLine','keyChanges','impact','keyRisks','delivery']);
const META_KEYS = new Set(['status','version','scope','confidence']);
const SCOPING_KEYS = new Set(['fullDesignRequired','pressure','reasons','dimensions']);
const EVIDENCE_KEYS = new Set(['facts','assumptions','unknowns']);
const EVIDENCE_ITEM_KEYS = new Set(['id','text','source','material']);
const BLOCK_KEYS = new Set(['id','type','title','importance','reason','reading','representation','content','sourceRefs']);
const READING_KEYS = new Set(['role','group']);
const REPRESENTATION_KEYS = new Set(['kind','engine','reason','spec']);

export const BUDGETS = {
  low: { diagrams: 1, tables: 2, blocks: 6 },
  medium: { diagrams: 3, tables: 4, blocks: 9 },
  high: { diagrams: Infinity, tables: Infinity, blocks: Infinity }
};

export const READING_BUDGETS = {
  low: { groups: 3, briefPoints: 5, coreBlocks: 5 },
  medium: { groups: 5, briefPoints: 7, coreBlocks: 7 },
  high: { groups: 6, briefPoints: 8, coreBlocks: 8 }
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

function rejectUnknownKeys(value, allowed, code, errors, blockId = null) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(finding(code, 'error', `Unsupported property: ${key}.`, blockId));
  }
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

function validateStringArray(value, { code, label, min = 0, max = Infinity, unique = false }, errors) {
  if (!Array.isArray(value)) {
    errors.push(finding(code, 'error', `${label} must be an array.`));
    return;
  }
  if (value.length < min || value.length > max) {
    const range = Number.isFinite(max) ? `${min}–${max}` : `at least ${min}`;
    errors.push(finding(`${code}.length`, 'error', `${label} must contain ${range} items.`));
  }
  const seen = new Set();
  for (const item of value) {
    if (!nonEmpty(item)) errors.push(finding(`${code}.item`, 'error', `Every ${label} item must be non-empty.`));
    if (unique && seen.has(item)) errors.push(finding(`${code}.duplicate`, 'error', `${label} must not contain duplicate items.`));
    seen.add(item);
  }
}

function validateBrief(brief, errors) {
  if (brief === undefined) return;
  if (!isObject(brief)) {
    errors.push(finding('brief.type', 'error', 'brief must be an object.'));
    return;
  }
  rejectUnknownKeys(brief, BRIEF_KEYS, 'brief.additional_property', errors);
  if (!nonEmpty(brief.bottomLine)) errors.push(finding('brief.bottom_line', 'error', 'brief.bottomLine is required.'));
  validateStringArray(brief.keyChanges, { code: 'brief.key_changes', label: 'brief.keyChanges', min: 1, max: 5, unique: true }, errors);
  validateStringArray(brief.keyRisks, { code: 'brief.key_risks', label: 'brief.keyRisks', min: 0, max: 3, unique: true }, errors);
  if (brief.impact !== undefined && !nonEmpty(brief.impact)) errors.push(finding('brief.impact', 'error', 'brief.impact must be a non-empty string.'));
  if (brief.delivery !== undefined && !nonEmpty(brief.delivery)) errors.push(finding('brief.delivery', 'error', 'brief.delivery must be a non-empty string.'));
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

function defaultReading(block, solution, blocks) {
  const dims = solution?.scoping?.dimensions ?? {};
  const hasCoreCallView = blocks.some(candidate => ['architecture','flow'].includes(candidate?.type));
  switch (block?.type) {
    case 'summary':
    case 'context':
    case 'goals':
    case 'change_set':
      return { role: 'core', group: 'overview' };
    case 'architecture':
    case 'flow':
      return { role: 'core', group: 'design' };
    case 'decisions':
      return { role: 'core', group: 'decisions' };
    case 'rollout':
    case 'verification':
    case 'risks':
      return { role: 'core', group: 'delivery' };
    case 'interfaces':
      return dims.callChain === 'high' && !hasCoreCallView
        ? { role: 'core', group: 'design' }
        : { role: 'detail', group: 'details' };
    case 'data':
      return dims.dataChange === 'high'
        ? { role: 'core', group: 'design' }
        : { role: 'detail', group: 'details' };
    case 'non_functional':
      return dims.performanceCapacity === 'high'
        ? { role: 'core', group: 'design' }
        : { role: 'detail', group: 'details' };
    default:
      return { role: 'detail', group: 'details' };
  }
}

export function planReading(solution) {
  const blocks = Array.isArray(solution?.blocks) ? solution.blocks : [];
  const groups = new Map(READING_GROUP_ORDER.map(id => [id, {
    id,
    title: READING_GROUP_TITLES[id],
    blocks: []
  }]));

  const plannedBlocks = blocks.map(block => {
    const fallback = defaultReading(block, solution, blocks);
    const role = READING_ROLES.has(block?.reading?.role) ? block.reading.role : fallback.role;
    const group = READING_GROUPS.has(block?.reading?.group) ? block.reading.group : fallback.group;
    const planned = { ...block, reading: { role, group } };
    groups.get(group).blocks.push(planned);
    return planned;
  });

  const visibleGroups = READING_GROUP_ORDER.map(id => groups.get(id)).filter(group => group.blocks.length > 0);
  return {
    groups: visibleGroups,
    blocks: plannedBlocks,
    coreBlocks: plannedBlocks.filter(block => block.reading.role === 'core'),
    detailBlocks: plannedBlocks.filter(block => block.reading.role === 'detail'),
    referenceBlocks: plannedBlocks.filter(block => block.reading.role === 'reference')
  };
}

export function countBriefPoints(brief) {
  if (!isObject(brief)) return 0;
  return (nonEmpty(brief.bottomLine) ? 1 : 0)
    + (Array.isArray(brief.keyChanges) ? brief.keyChanges.length : 0)
    + (nonEmpty(brief.impact) ? 1 : 0)
    + (Array.isArray(brief.keyRisks) ? brief.keyRisks.length : 0)
    + (nonEmpty(brief.delivery) ? 1 : 0);
}

export function validateSolution(solution) {
  const errors = [];
  const warnings = [];
  if (!isObject(solution)) return { ok: false, errors: [finding('root.type', 'error', 'Solution must be an object.')], warnings };
  rejectUnknownKeys(solution, ROOT_KEYS, 'root.additional_property', errors);
  if (solution.schemaVersion !== '0.1') errors.push(finding('schema.version', 'error', 'schemaVersion must be "0.1".'));
  if (!nonEmpty(solution.title)) errors.push(finding('title.required', 'error', 'title is required.'));
  if (solution.summary !== undefined && typeof solution.summary !== 'string') errors.push(finding('summary.type', 'error', 'summary must be a string.'));
  validateBrief(solution.brief, errors);

  if (solution.meta !== undefined) {
    if (!isObject(solution.meta)) errors.push(finding('meta.type', 'error', 'meta must be an object.'));
    else {
      rejectUnknownKeys(solution.meta, META_KEYS, 'meta.additional_property', errors);
      if (solution.meta.confidence !== undefined && !PRESSURE.has(solution.meta.confidence)) errors.push(finding('meta.confidence', 'error', 'meta.confidence must be high, medium, or low.'));
    }
  }

  const scoping = solution.scoping;
  if (!isObject(scoping)) {
    errors.push(finding('scoping.required', 'error', 'scoping is required.'));
  } else {
    rejectUnknownKeys(scoping, SCOPING_KEYS, 'scoping.additional_property', errors);
    if (typeof scoping.fullDesignRequired !== 'boolean') errors.push(finding('scoping.fullDesignRequired', 'error', 'scoping.fullDesignRequired must be boolean.'));
    if (!PRESSURE.has(scoping.pressure)) errors.push(finding('scoping.pressure', 'error', 'scoping.pressure must be low, medium, or high.'));
    if (!Array.isArray(scoping.reasons) || scoping.reasons.length === 0) errors.push(finding('scoping.reasons', 'error', 'scoping.reasons must contain at least one reason.'));
    else for (const reason of scoping.reasons) if (!nonEmpty(reason)) errors.push(finding('scoping.reasons.item', 'error', 'Every scoping reason must be non-empty.'));
    if (!isObject(scoping.dimensions)) {
      errors.push(finding('scoping.dimensions.required', 'error', 'All six scoping dimensions are required.'));
    } else {
      rejectUnknownKeys(scoping.dimensions, new Set(REQUIRED_DIMENSIONS), 'scoping.dimension.unknown', errors);
      for (const key of REQUIRED_DIMENSIONS) {
        if (!PRESSURE.has(scoping.dimensions[key])) errors.push(finding('scoping.dimension.required', 'error', `Missing or invalid scoping dimension: ${key}.`));
      }
    }
  }

  const evidence = solution.evidence;
  const evidenceIds = new Set();
  if (!isObject(evidence)) {
    errors.push(finding('evidence.required', 'error', 'evidence is required.'));
  } else {
    rejectUnknownKeys(evidence, EVIDENCE_KEYS, 'evidence.additional_property', errors);
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
        rejectUnknownKeys(item, EVIDENCE_ITEM_KEYS, `evidence.${key}.additional_property`, errors);
        if (item.source !== undefined && typeof item.source !== 'string') errors.push(finding(`evidence.${key}.source`, 'error', 'Evidence source must be a string.'));
        if (item.material !== undefined && typeof item.material !== 'boolean') errors.push(finding(`evidence.${key}.material`, 'error', 'Evidence material must be boolean.'));
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
    rejectUnknownKeys(block, BLOCK_KEYS, 'block.additional_property', errors, block.id);
    if (validateId(block.id, 'block.id', 'Block id', errors, block.id) && seen.has(block.id)) errors.push(finding('block.id.duplicate', 'error', `Duplicate block id: ${block.id}`, block.id));
    else if (nonEmpty(block.id)) seen.add(block.id);
    if (block.title !== undefined && typeof block.title !== 'string') errors.push(finding('block.title', 'error', 'Block title must be a string.', block.id));
    if (!BLOCK_TYPES.has(block.type)) errors.push(finding('block.type.invalid', 'error', `Invalid block type: ${block.type}`, block.id));
    if (!PRESSURE.has(block.importance)) errors.push(finding('block.importance', 'error', 'Block importance must be low, medium, or high.', block.id));
    if (!nonEmpty(block.reason)) errors.push(finding('block.reason', 'error', 'Every block must explain why it exists.', block.id));
    if (!Object.prototype.hasOwnProperty.call(block, 'content')) errors.push(finding('block.content.required', 'error', 'Every block must contain content.', block.id));

    if (block.reading !== undefined) {
      if (!isObject(block.reading)) errors.push(finding('reading.type', 'error', 'Block reading must be an object.', block.id));
      else {
        rejectUnknownKeys(block.reading, READING_KEYS, 'reading.additional_property', errors, block.id);
        if (!READING_ROLES.has(block.reading.role)) errors.push(finding('reading.role', 'error', 'reading.role must be core, detail, or reference.', block.id));
        if (!READING_GROUPS.has(block.reading.group)) errors.push(finding('reading.group', 'error', 'reading.group is invalid.', block.id));
      }
    }

    if (block.sourceRefs !== undefined) {
      if (!Array.isArray(block.sourceRefs)) errors.push(finding('block.source_refs.type', 'error', 'sourceRefs must be an array.', block.id));
      else {
        const refs = new Set();
        for (const ref of block.sourceRefs) {
          if (refs.has(ref)) errors.push(finding('block.source_ref.duplicate', 'error', `Duplicate evidence reference: ${ref}`, block.id));
          refs.add(ref);
          if (!nonEmpty(ref) || !evidenceIds.has(ref)) errors.push(finding('block.source_ref.invalid', 'error', `Unknown evidence reference: ${ref}`, block.id));
        }
      }
    }

    const rep = block.representation;
    if (!isObject(rep)) { errors.push(finding('representation.required', 'error', 'representation is required.', block.id)); continue; }
    rejectUnknownKeys(rep, REPRESENTATION_KEYS, 'representation.additional_property', errors, block.id);
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
  if (Array.isArray(spec.states)) return spec.states.length;
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
    if (block?.reading?.role === 'reference' && block?.reading?.group !== 'appendix') findings.push(finding('readability.reference_group', 'warning', 'Reference material should normally live in the appendix.', block.id));
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

  const pressure = solution?.scoping?.pressure;
  const readingPlan = planReading(solution);
  if (PRESSURE.has(pressure)) {
    const budget = READING_BUDGETS[pressure];
    const explicitReadingCount = blocks.filter(block => isObject(block?.reading)).length;
    const briefPoints = countBriefPoints(solution?.brief);

    if (['medium','high'].includes(pressure) && !isObject(solution?.brief)) {
      findings.push(finding('readability.brief.missing', 'warning', `${pressure} pressure solution should provide a BLUF brief for the first screen.`));
    }
    if (['medium','high'].includes(pressure) && explicitReadingCount < blocks.length) {
      findings.push(finding('readability.metadata.missing', 'warning', `${blocks.length - explicitReadingCount} blocks rely on default reading placement; medium/high solutions should normally provide explicit reading metadata.`));
    }
    if (readingPlan.groups.length > budget.groups) {
      findings.push(finding('readability.groups', 'warning', `${pressure} pressure solution exposes ${readingPlan.groups.length} first-level reading groups; budget is ${budget.groups}. Merge or move content deeper.`));
    }
    if (readingPlan.coreBlocks.length > budget.coreBlocks) {
      findings.push(finding('readability.core_blocks', 'warning', `${pressure} pressure solution exposes ${readingPlan.coreBlocks.length} core blocks; budget is ${budget.coreBlocks}. Move implementation detail deeper.`));
    }
    if (briefPoints > budget.briefPoints) {
      findings.push(finding('readability.brief_points', 'warning', `First-screen brief has ${briefPoints} information points; ${pressure} budget is ${budget.briefPoints}. Keep only load-bearing conclusions.`));
    }
    if (blocks.length > 5 && readingPlan.coreBlocks.length === blocks.length) {
      findings.push(finding('readability.all_core', 'warning', 'Every block is exposed as core. Progressive disclosure is not working; move implementation/reference material deeper.'));
    }
  }

  const errors = findings.filter(x => x.severity === 'error');
  const warnings = findings.filter(x => x.severity === 'warning');
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts: countRepresentations(solution),
    pressure: pressure ?? null,
    reading: {
      groups: readingPlan.groups.length,
      coreBlocks: readingPlan.coreBlocks.length,
      detailBlocks: readingPlan.detailBlocks.length,
      referenceBlocks: readingPlan.referenceBlocks.length,
      briefPoints: countBriefPoints(solution?.brief)
    }
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
