import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { validateSolution, reviewSolution, planReading, countBriefPoints } from '../src/core.mjs';
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
  const bad = clone(simple);
  bad.blocks[0].reading = { role: 'everything', group: 'overview' };
  const result = validateSolution(bad);
  assert.equal(result.ok, false);
  assert.ok(hasCode(result.errors, 'reading.role'));
}

{
  const bad = clone(simple);
  bad.brief = { bottomLine: '改造', keyChanges: [], keyRisks: [] };
  const result = validateSolution(bad);
  assert.equal(result.ok, false);
  assert.ok(hasCode(result.errors, 'brief.key_changes.length'));
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
  const result = reviewSolution(kafka);
  assert.ok(hasCode(result.warnings, 'readability.brief.missing'));
  assert.ok(hasCode(result.warnings, 'readability.metadata.missing'));
  assert.equal(result.reading.groups, 5);
  assert.equal(result.reading.coreBlocks, 8);
}

{
  const narrative = clone(kafka);
  narrative.brief = {
    bottomLine: '订单主事务只负责落库与可靠发布事件，积分和通知迁出同步请求并由 Kafka 异步处理。',
    keyChanges: [
      '订单与 Outbox 同事务提交，避免数据库成功但事件丢失。',
      '积分与通知改为至少一次消费，并通过 eventId 做业务幂等。',
      '消费失败按策略重试，超限进入 DLQ。'
    ],
    impact: '支付链路不变；订单接口成功语义仍以订单主事务提交为准。',
    keyRisks: ['Kafka 容量需在上线前核实。', '灰度期间必须避免同步与异步双执行。'],
    delivery: '影子发布 → 小流量异步 → 全量，保留同步实现开关用于回退。'
  };
  narrative.blocks = planReading(narrative).blocks;

  const validation = validateSolution(narrative);
  assert.equal(validation.ok, true, JSON.stringify(validation.errors));
  const review = reviewSolution(narrative);
  assert.ok(!hasCode(review.warnings, 'readability.brief.missing'));
  assert.ok(!hasCode(review.warnings, 'readability.metadata.missing'));
  assert.equal(countBriefPoints(narrative.brief), 8);
  assert.equal(review.reading.groups, 5);
  assert.equal(review.reading.coreBlocks, 8);

  const html = renderSolutionHtml(narrative);
  assert.ok(html.includes('方案结论'));
  assert.ok(html.includes('核心变化'));
  assert.ok(html.includes('group-overview'));
  assert.ok(html.includes('group-design'));
  assert.ok(html.includes('group-details'));
  assert.ok(html.includes('class="reading-group reading-group-collapsed"'));
  assert.ok(html.includes('依据与附录'));
  assert.ok(!html.includes('为什么保留：'));
  assert.ok(!html.includes('内容块</span>'));
}

{
  const html = renderSolutionHtml(simple);
  assert.ok(html.includes('class="source-ref"'));
  assert.ok(html.includes('本次只增加订单查询响应字段。'));
  assert.ok(html.includes('title="原始 ID：fact-field-only'));
  assert.ok(!html.includes('<code>fact-field-only</code>'));
  assert.ok(html.includes('data-nav-link'));
  assert.ok(html.includes('class="nav-group" open'));
  assert.ok(html.includes('updateActiveNav'));
  assert.ok(html.includes("setAttribute('aria-current', 'location')"));
  assert.ok(html.includes('class="importance-high"'));
  assert.ok(html.includes('class="importance medium">medium</span>'));
  assert.ok(html.includes('class="content-block"'));
  assert.ok(html.includes('group-overview'));
  assert.ok(html.includes('group-delivery'));
  assert.ok(html.includes('group-details'));
}

{
  const html = renderSolutionHtml(kafka);
  assert.ok(html.includes('class="content-block content-block-emphasis"'));
  assert.ok(html.includes('方案怎么工作'));
  assert.ok(html.includes('为什么这样设计'));
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

console.log(JSON.stringify({ ok: true, negativeCases: 15, narrativeCases: 3, uiCases: 3 }, null, 2));
