import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { validateSolution, reviewSolution, simplifySolution, countRepresentations } from '../src/core.mjs';
import { renderSolutionHtml } from '../src/render.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cases = [
  { dir: '01-simple-field', pressure: 'low', blocks: [3, 6], diagrams: 0, maxTables: 2 },
  { dir: '02-redis-cache', pressure: 'medium', blocks: [5, 9], diagrams: 0, maxTables: 4 },
  { dir: '03-kafka-async', pressure: 'high', blocks: [8, 20], diagrams: 2, maxTables: 20 }
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hrth-golden-'));
for (const c of cases) {
  const file = path.join(root, 'examples', c.dir, 'solution.json');
  const solution = JSON.parse(fs.readFileSync(file, 'utf8'));
  const validation = validateSolution(solution);
  assert.equal(validation.ok, true, `${c.dir} validation errors: ${JSON.stringify(validation.errors)}`);
  const review = reviewSolution(solution);
  assert.equal(review.ok, true, `${c.dir} review errors: ${JSON.stringify(review.errors)}`);
  assert.equal(review.pressure, c.pressure);
  const counts = countRepresentations(solution);
  assert.ok(counts.blocks >= c.blocks[0] && counts.blocks <= c.blocks[1], `${c.dir} block budget`);
  assert.equal(counts.diagrams, c.diagrams, `${c.dir} diagram count`);
  assert.ok(counts.tables <= c.maxTables, `${c.dir} table count`);
  const simplified = simplifySolution(solution);
  assert.equal(simplified.removed.length, 0, `${c.dir} should already be simplified`);
  const html = renderSolutionHtml(solution);
  assert.ok(html.includes(solution.title));
  assert.ok(html.includes('Generated from solution.json'));
  assert.ok(!html.includes('undefined'));
  fs.writeFileSync(path.join(tmp, `${c.dir}.html`), html);
}

const simple = JSON.parse(fs.readFileSync(path.join(root, 'examples/01-simple-field/solution.json'), 'utf8'));
assert.equal(simple.scoping.fullDesignRequired, false, 'simple field change must not force a full design');
const redis = JSON.parse(fs.readFileSync(path.join(root, 'examples/02-redis-cache/solution.json'), 'utf8'));
assert.equal(countRepresentations(redis).diagrams, 0, 'Redis example intentionally proves medium complexity does not require a diagram');
const kafka = JSON.parse(fs.readFileSync(path.join(root, 'examples/03-kafka-async/solution.json'), 'utf8'));
assert.deepEqual(kafka.blocks.filter(b => ['architecture','flow'].includes(b.type)).map(b => b.representation.engine), ['archify','archify']);

console.log(JSON.stringify({ ok: true, cases: cases.length, renderedTo: tmp }, null, 2));
