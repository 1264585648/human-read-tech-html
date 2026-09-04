import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { validateSolution, reviewSolution } from '../src/core.mjs';
import { renderSolutionHtml } from '../src/render.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readCase = name => JSON.parse(fs.readFileSync(path.join(root, 'examples', name, 'solution.json'), 'utf8'));
const clone = value => structuredClone(value);
const hasCode = (items, code) => items.some(item => item.code === code);
const hashSpec = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

const simple = readCase('01-simple-field');
const kafka = readCase('03-kafka-async');

{
  const bad = clone(simple);
  delete bad.scoping.dimensions;
  const result = validateSolution(bad);
  assert.equal(result.ok, false);
  assert.ok(hasCode(result.errors, 'scoping.dimensions.required'));
}

{
  const bad = clone(simple);
  bad.unexpected = true;
  const result = validateSolution(bad);
  assert.equal(result.ok, false);
  assert.ok(hasCode(result.errors, 'root.additional_property'));
}

{
  const bad = clone(simple);
  bad.meta.confidence = 'certain';
  const result = validateSolution(bad);
  assert.equal(result.ok, false);
  assert.ok(hasCode(result.errors, 'meta.confidence'));
}

{
  const bad = clone(simple);
  delete bad.blocks[0].content;
  const result = validateSolution(bad);
  assert.equal(result.ok, false);
  assert.ok(hasCode(result.errors, 'block.content.required'));
}

{
  const bad = clone(simple);
  bad.blocks[0].id = 'Bad Block';
  const result = validateSolution(bad);
  assert.equal(result.ok, false);
  assert.ok(hasCode(result.errors, 'block.id.format'));
}

{
  const bad = clone(simple);
  bad.evidence.facts[1].id = bad.evidence.facts[0].id;
  const result = validateSolution(bad);
  assert.equal(result.ok, false);
  assert.ok(hasCode(result.errors, 'evidence.id.duplicate'));
}

{
  const bad = clone(simple);
  bad.blocks[0].sourceRefs = ['fact-does-not-exist'];
  const result = validateSolution(bad);
  assert.equal(result.ok, false);
  assert.ok(hasCode(result.errors, 'block.source_ref.invalid'));
}

{
  const bad = clone(simple);
  bad.blocks[0].sourceRefs = ['fact-field-only', 'fact-field-only'];
  const result = validateSolution(bad);
  assert.equal(result.ok, false);
  assert.ok(hasCode(result.errors, 'block.source_ref.duplicate'));
}

{
  const bad = clone(kafka);
  const architecture = bad.blocks.find(block => block.id === 'architecture');
  architecture.representation.spec.connections[0].to = 'missing-component';
  const result = validateSolution(bad);
  assert.equal(result.ok, false);
  assert.ok(hasCode(result.errors, 'archify.connection.to'));
}

{
  const routed = clone(kafka);
  const architecture = routed.blocks.find(block => block.id === 'architecture');
  architecture.representation.engine = 'mermaid';
  const result = validateSolution(routed);
  assert.equal(result.ok, true);
  assert.ok(hasCode(result.warnings, 'router.archify.preferred'));
}

{
  const uncertain = clone(kafka);
  uncertain.meta.confidence = 'high';
  const result = reviewSolution(uncertain);
  assert.ok(hasCode(result.warnings, 'evidence.confidence'));
}

{
  const incomplete = clone(kafka);
  incomplete.blocks = incomplete.blocks.filter(block => block.type !== 'verification');
  const result = reviewSolution(incomplete);
  assert.ok(hasCode(result.warnings, 'completeness.verification'));
}

{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hrth-stale-diagram-'));
  fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({
    solution: kafka.title,
    diagrams: [
      { id: 'architecture', sourceHash: 'stale', expectedHtml: 'architecture.html' },
      { id: 'flow', sourceHash: hashSpec(kafka.blocks.find(block => block.id === 'flow').representation.spec), expectedHtml: 'flow.html' }
    ]
  }));
  fs.writeFileSync(path.join(tmp, 'architecture.html'), '<p>stale artifact</p>');
  fs.writeFileSync(path.join(tmp, 'flow.html'), '<p>valid artifact</p>');
  const html = renderSolutionHtml(kafka, { diagramDir: tmp });
  assert.ok(html.includes('source hash'));
  assert.ok(!html.includes('stale artifact'));
  assert.ok(html.includes('valid artifact'));
  assert.ok(html.includes('sandbox="allow-scripts"'));
  assert.ok(html.includes('allow="fullscreen"'));
  assert.ok(html.includes('allowfullscreen'));
  assert.ok(html.includes('data-diagram-fullscreen'));
  assert.ok(html.includes('requestFullscreen'));
  assert.ok(html.includes('.embedded-diagram:fullscreen'));
}

console.log(JSON.stringify({ ok: true, negativeCases: 13, uiCases: 1 }, null, 2));
