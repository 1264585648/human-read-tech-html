import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  compileDocumentAst,
  compileV2Solution,
  listConcernPacks,
  reviewV2Solution,
  validateV2Solution
} from '../src/v2.mjs';
import { renderV2SolutionHtml } from '../src/v2-render.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'examples', '04-kafka-v2', 'solution.json');
const solution = JSON.parse(fs.readFileSync(file, 'utf8'));

const validation = validateV2Solution(solution);
assert.equal(validation.ok, true, JSON.stringify(validation.errors));
assert.ok(!validation.warnings.some(item => item.code === 'v2.concern.unanswered'));

const ast = compileDocumentAst(solution);
assert.equal(ast.groups.length, 5);
assert.equal(ast.nodes.length, 9);
assert.deepEqual(ast.groups.map(group => group.title), [
  '这次到底改变了什么',
  '新方案怎么工作',
  '为什么这样设计',
  '怎么安全上线并证明可恢复',
  '实施时再看这些细节'
]);

const architectureNodes = ast.nodes.filter(node => node.blockRef === 'architecture');
assert.equal(architectureNodes.length, 2, 'one semantic block should support multiple presentation nodes');
assert.deepEqual(architectureNodes.map(node => node.kind), ['architecture', 'text']);

const compiled = compileV2Solution(solution);
assert.equal(compiled.schemaVersion, '0.1');
assert.equal(compiled.blocks.length, 9);
assert.equal(compiled.blocks.find(block => block.id === 'architecture-diagram').representation.kind, 'architecture');
assert.equal(compiled.blocks.find(block => block.id === 'architecture-boundary').representation.kind, 'text');
assert.equal(compiled.blocks.find(block => block.id === 'architecture-boundary').reading.role, 'core');

const review = reviewV2Solution(solution);
assert.equal(review.ok, true, JSON.stringify(review.errors));
assert.equal(review.concernPacks[0], 'async-messaging');
assert.equal(review.document.groups, 5);
assert.equal(review.document.nodes, 9);
assert.equal(review.document.understandGroups, 4);
assert.ok(!review.warnings.some(item => item.code === 'v2.concern.answer_untraceable'));

const html = renderV2SolutionHtml(solution);
assert.ok(html.includes('V2 layered compiler'));
assert.ok(html.includes('这次到底改变了什么'));
assert.ok(html.includes('新方案怎么工作'));
assert.ok(html.includes('怎么安全上线并证明可恢复'));
assert.ok(html.includes('实施时再看这些细节'));
assert.ok(html.includes('订单成功不再依赖积分或通知服务实时可用'));
assert.ok(html.includes('architecture-boundary'));

const packs = listConcernPacks();
assert.ok(packs.length >= 4);
assert.ok(packs.some(pack => pack.id === 'async-messaging'));
assert.ok(packs.some(pack => pack.id === 'cache'));
assert.ok(packs.some(pack => pack.id === 'data-migration'));
assert.ok(packs.some(pack => pack.id === 'external-api'));

console.log(JSON.stringify({
  ok: true,
  schemaVersion: solution.schemaVersion,
  modelBlocks: solution.model.blocks.length,
  documentNodes: ast.nodes.length,
  concernPacks: packs.length
}, null, 2));
