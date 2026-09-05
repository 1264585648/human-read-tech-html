import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSolution, reviewSolution } from './core.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const BLOCK_TYPES = new Set([
  'summary','context','goals','change_set','architecture','flow','interfaces','data',
  'decisions','non_functional','rollout','verification','risks'
]);
const PRESENTATION_KINDS = new Set([
  'text','table','cards','architecture','sequence','workflow','dataflow','lifecycle','er','gantt'
]);
const ENGINES = new Set(['native','archify','mermaid','none']);
const LAYERS = new Set(['understand','implement','reference']);
const SLOTS = new Set(['overview','design','decisions','delivery','details','appendix']);
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

const SLOT_TITLES = {
  overview: '先看结论',
  design: '方案怎么工作',
  decisions: '为什么这样设计',
  delivery: '如何安全上线',
  details: '实施细节',
  appendix: '依据与附录'
};

function finding(code, severity, message, ref = null) {
  return { code, severity, message, ...(ref ? { ref } : {}) };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function defaultEngine(kind) {
  if (['text','table','cards'].includes(kind)) return 'native';
  if (['architecture','sequence','workflow','dataflow','lifecycle'].includes(kind)) return 'archify';
  if (['er','gantt'].includes(kind)) return 'mermaid';
  return 'none';
}

function roleForLayer(layer) {
  if (layer === 'understand') return 'core';
  if (layer === 'reference') return 'reference';
  return 'detail';
}

export function loadConcernPack(id) {
  if (!ID_PATTERN.test(id ?? '')) return null;
  const file = path.join(ROOT, 'concerns', `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function listConcernPacks() {
  const dir = path.join(ROOT, 'concerns');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.json'))
    .map(name => loadConcernPack(name.slice(0, -5)))
    .filter(Boolean);
}

export function compileDocumentAst(solution) {
  if (solution?.schemaVersion !== '0.2') throw new Error('compileDocumentAst expects schemaVersion 0.2');
  const blocks = new Map((solution.model?.blocks ?? []).map(block => [block.id, block]));
  const groups = [];

  for (const group of solution.view?.groups ?? []) {
    const nodes = [];
    for (const item of group.items ?? []) {
      const block = blocks.get(item.blockRef);
      if (!block) continue;
      const presentations = Array.isArray(item.presentations) && item.presentations.length
        ? item.presentations
        : [{ kind: 'text', engine: 'native', reason: 'Default semantic presentation.' }];

      presentations.forEach((presentation, index) => {
        nodes.push({
          id: presentation.id || `${block.id}--p${index + 1}`,
          blockRef: block.id,
          type: block.type,
          title: presentation.title || block.title || block.type,
          importance: block.importance,
          reason: block.reason,
          layer: group.layer,
          slot: group.slot,
          kind: presentation.kind,
          engine: presentation.engine || defaultEngine(presentation.kind),
          presentationReason: presentation.reason || 'Selected by the view planner.',
          content: Object.prototype.hasOwnProperty.call(presentation, 'content') ? presentation.content : block.content,
          spec: presentation.spec,
          sourceRefs: block.sourceRefs ?? []
        });
      });
    }
    groups.push({
      id: group.id,
      title: group.title || SLOT_TITLES[group.slot] || group.id,
      layer: group.layer,
      slot: group.slot,
      nodes
    });
  }

  return {
    title: solution.title,
    brief: solution.view?.brief,
    groups,
    nodes: groups.flatMap(group => group.nodes)
  };
}

export function compileV2Solution(solution) {
  const ast = compileDocumentAst(solution);
  const blocks = ast.nodes.map(node => ({
    id: node.id,
    type: node.type,
    title: node.title,
    importance: node.importance,
    reason: node.reason,
    reading: { role: roleForLayer(node.layer), group: node.slot },
    representation: {
      kind: node.kind,
      engine: node.engine,
      reason: node.presentationReason,
      ...(node.spec === undefined ? {} : { spec: node.spec })
    },
    content: node.content,
    ...(node.sourceRefs?.length ? { sourceRefs: node.sourceRefs } : {})
  }));

  return {
    schemaVersion: '0.1',
    title: solution.title,
    ...(solution.summary ? { summary: solution.summary } : {}),
    ...(ast.brief ? { brief: ast.brief } : {}),
    ...(solution.meta ? { meta: solution.meta } : {}),
    scoping: solution.scoping,
    evidence: solution.evidence,
    blocks
  };
}

export function validateV2Solution(solution) {
  const errors = [];
  const warnings = [];

  if (!isObject(solution)) return { ok: false, errors: [finding('v2.root.type', 'error', 'Solution must be an object.')], warnings };
  if (solution.schemaVersion !== '0.2') errors.push(finding('v2.schema.version', 'error', 'schemaVersion must be "0.2".'));
  if (!nonEmpty(solution.title)) errors.push(finding('v2.title.required', 'error', 'title is required.'));
  if (!isObject(solution.model) || !Array.isArray(solution.model.blocks)) errors.push(finding('v2.model.blocks', 'error', 'model.blocks must be an array.'));
  if (!isObject(solution.view) || !Array.isArray(solution.view.groups)) errors.push(finding('v2.view.groups', 'error', 'view.groups must be an array.'));
  if (!Array.isArray(solution.concerns)) errors.push(finding('v2.concerns', 'error', 'concerns must be an array.'));

  const blockIds = new Set();
  for (const block of solution.model?.blocks ?? []) {
    if (!isObject(block) || !nonEmpty(block.id) || !ID_PATTERN.test(block.id)) {
      errors.push(finding('v2.block.id', 'error', 'Every model block needs a stable lowercase id.'));
      continue;
    }
    if (blockIds.has(block.id)) errors.push(finding('v2.block.duplicate', 'error', `Duplicate model block id: ${block.id}`, block.id));
    blockIds.add(block.id);
    if (!BLOCK_TYPES.has(block.type)) errors.push(finding('v2.block.type', 'error', `Unsupported block type: ${block.type}`, block.id));
    if (!['high','medium','low'].includes(block.importance)) errors.push(finding('v2.block.importance', 'error', 'importance must be high, medium, or low.', block.id));
    if (!nonEmpty(block.reason)) errors.push(finding('v2.block.reason', 'error', 'Every model block must explain why it is technically necessary.', block.id));
    if (!Object.prototype.hasOwnProperty.call(block, 'content')) errors.push(finding('v2.block.content', 'error', 'Every model block requires content.', block.id));
    if (block.reading !== undefined || block.representation !== undefined) {
      errors.push(finding('v2.model.view_leak', 'error', 'V2 model blocks must not contain reading or representation metadata.', block.id));
    }
  }

  const slots = new Set();
  const referencedBlocks = new Set();
  for (const group of solution.view?.groups ?? []) {
    if (!isObject(group) || !nonEmpty(group.id) || !ID_PATTERN.test(group.id)) errors.push(finding('v2.group.id', 'error', 'Every view group needs a stable lowercase id.'));
    if (!LAYERS.has(group.layer)) errors.push(finding('v2.group.layer', 'error', `Invalid reading layer: ${group.layer}`, group.id));
    if (!SLOTS.has(group.slot)) errors.push(finding('v2.group.slot', 'error', `Invalid narrative slot: ${group.slot}`, group.id));
    if (slots.has(group.slot)) errors.push(finding('v2.group.slot_duplicate', 'error', `Only one view group may occupy slot ${group.slot}.`, group.id));
    slots.add(group.slot);
    if (!Array.isArray(group.items) || !group.items.length) errors.push(finding('v2.group.items', 'error', 'Every view group must contain at least one item.', group.id));

    for (const item of group.items ?? []) {
      if (!blockIds.has(item?.blockRef)) errors.push(finding('v2.view.block_ref', 'error', `Unknown blockRef: ${item?.blockRef}`, group.id));
      else referencedBlocks.add(item.blockRef);
      if (!Array.isArray(item?.presentations) || !item.presentations.length) errors.push(finding('v2.presentation.required', 'error', 'Every view item must declare one or more presentations.', item?.blockRef));
      for (const presentation of item?.presentations ?? []) {
        if (!PRESENTATION_KINDS.has(presentation?.kind)) errors.push(finding('v2.presentation.kind', 'error', `Unsupported presentation kind: ${presentation?.kind}`, item?.blockRef));
        if (presentation?.engine !== undefined && !ENGINES.has(presentation.engine)) errors.push(finding('v2.presentation.engine', 'error', `Unsupported presentation engine: ${presentation.engine}`, item?.blockRef));
        if (!nonEmpty(presentation?.reason)) warnings.push(finding('v2.presentation.reason', 'warning', 'Presentation should explain why it helps this reading layer.', item?.blockRef));
        if (['architecture','sequence','workflow','dataflow','lifecycle','er','gantt'].includes(presentation?.kind) && !isObject(presentation?.spec)) {
          errors.push(finding('v2.presentation.spec', 'error', 'Diagram presentations require a typed spec object.', item?.blockRef));
        }
      }
    }
  }

  for (const id of blockIds) {
    if (!referencedBlocks.has(id)) warnings.push(finding('v2.model.unused', 'warning', 'Semantic block is not exposed by the current view plan.', id));
  }

  const evidenceIds = new Set([
    ...(solution.evidence?.facts ?? []),
    ...(solution.evidence?.assumptions ?? []),
    ...(solution.evidence?.unknowns ?? [])
  ].map(item => item?.id).filter(Boolean));

  const concernIds = new Set();
  for (const concern of solution.concerns ?? []) {
    if (!nonEmpty(concern?.id)) {
      errors.push(finding('v2.concern.id', 'error', 'Concern id is required.'));
      continue;
    }
    if (concernIds.has(concern.id)) errors.push(finding('v2.concern.duplicate', 'error', `Duplicate concern: ${concern.id}`, concern.id));
    concernIds.add(concern.id);
    const pack = loadConcernPack(concern.id);
    if (!pack) {
      errors.push(finding('v2.concern.pack_missing', 'error', `Unknown concern pack: ${concern.id}`, concern.id));
      continue;
    }
    const answers = isObject(concern.answers) ? concern.answers : {};
    for (const question of pack.questions ?? []) {
      const answer = answers[question.id];
      if (!answer) {
        warnings.push(finding('v2.concern.unanswered', 'warning', `Concern question is unanswered: ${question.question}`, `${concern.id}.${question.id}`));
        continue;
      }
      if (!['answered','unknown','not_applicable'].includes(answer.status)) errors.push(finding('v2.concern.status', 'error', `Invalid concern answer status: ${answer.status}`, `${concern.id}.${question.id}`));
      for (const ref of answer.blockRefs ?? []) if (!blockIds.has(ref)) errors.push(finding('v2.concern.block_ref', 'error', `Concern answer references unknown block: ${ref}`, `${concern.id}.${question.id}`));
      for (const ref of answer.evidenceRefs ?? []) if (!evidenceIds.has(ref)) errors.push(finding('v2.concern.evidence_ref', 'error', `Concern answer references unknown evidence: ${ref}`, `${concern.id}.${question.id}`));
    }
  }

  if (!errors.length) {
    const compiled = compileV2Solution(solution);
    const legacyValidation = validateSolution(compiled);
    errors.push(...legacyValidation.errors.map(item => ({ ...item, code: `compiled.${item.code}` })));
    warnings.push(...legacyValidation.warnings.map(item => ({ ...item, code: `compiled.${item.code}` })));
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function reviewV2Solution(solution) {
  const validation = validateV2Solution(solution);
  if (!validation.ok) return { ...validation, concernPacks: (solution?.concerns ?? []).map(x => x.id) };

  const compiled = compileV2Solution(solution);
  const legacyReview = reviewSolution(compiled);
  const findings = [...validation.warnings, ...legacyReview.warnings];

  for (const concern of solution.concerns ?? []) {
    const pack = loadConcernPack(concern.id);
    if (!pack) continue;
    for (const question of pack.questions ?? []) {
      const answer = concern.answers?.[question.id];
      if (answer?.status === 'unknown') {
        findings.push(finding('v2.concern.material_unknown', 'warning', `Material concern remains unknown: ${question.question}`, `${concern.id}.${question.id}`));
      }
      if (answer?.status === 'answered' && !(answer.blockRefs?.length || answer.evidenceRefs?.length)) {
        findings.push(finding('v2.concern.answer_untraceable', 'warning', `Answered concern should point to a semantic block or evidence: ${question.question}`, `${concern.id}.${question.id}`));
      }
    }
  }

  const ast = compileDocumentAst(solution);
  const visibleGroups = ast.groups.filter(group => group.layer === 'understand').length;
  if (visibleGroups > 5) findings.push(finding('v2.readability.understand_groups', 'warning', `Understanding view exposes ${visibleGroups} groups; merge reader questions before adding more.`));

  return {
    ok: true,
    errors: [],
    warnings: findings,
    concernPacks: (solution.concerns ?? []).map(x => x.id),
    document: {
      groups: ast.groups.length,
      nodes: ast.nodes.length,
      understandGroups: visibleGroups
    },
    compiled: legacyReview
  };
}
