#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateSolution, reviewSolution, simplifySolution } from '../src/core.mjs';
import { renderSolutionHtml } from '../src/render.mjs';
import { compileV2Solution, listConcernPacks, reviewV2Solution, validateV2Solution } from '../src/v2.mjs';
import { renderV2SolutionHtml } from '../src/v2-render.mjs';

function usage(code = 0) {
  console.log(`Human Read Tech HTML CLI\n\nUsage:\n  hrth validate <solution.json>\n  hrth review <solution.json>\n  hrth simplify <solution.json> <output.json>\n  hrth compile <solution.v2.json> <output.v1.json>\n  hrth concerns\n  hrth diagrams <solution.json> <output-dir>\n  hrth render <solution.json> <output.html> [--diagram-dir <dir>]\n`);
  process.exit(code);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
}

function isV2(solution) {
  return solution?.schemaVersion === '0.2';
}

function normalizeSolution(solution) {
  return isV2(solution) ? compileV2Solution(solution) : solution;
}

function hashSpec(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function removeIfExists(file) {
  if (fs.existsSync(file)) fs.rmSync(file);
}

function readManifest(file) {
  if (!fs.existsSync(file)) return { diagrams: [] };
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(value?.diagrams) ? value : { diagrams: [] };
  } catch {
    return { diagrams: [] };
  }
}

const [, , command, ...args] = process.argv;
if (!command || command === '-h' || command === '--help') usage(0);

if (command === 'validate') {
  if (!args[0]) usage(1);
  const solution = readJson(args[0]);
  const result = isV2(solution) ? validateV2Solution(solution) : validateSolution(solution);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

if (command === 'review') {
  if (!args[0]) usage(1);
  const solution = readJson(args[0]);
  const result = isV2(solution) ? reviewV2Solution(solution) : reviewSolution(solution);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

if (command === 'simplify') {
  if (!args[0] || !args[1]) usage(1);
  const source = readJson(args[0]);
  if (isV2(source)) {
    console.error('V2 simplification operates at the semantic model/view-plan level and is intentionally not auto-mutated yet. Use review, then edit model/view explicitly.');
    process.exit(1);
  }
  const { solution, removed } = simplifySolution(source);
  fs.writeFileSync(path.resolve(args[1]), JSON.stringify(solution, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, output: path.resolve(args[1]), removed }, null, 2));
  process.exit(0);
}

if (command === 'compile') {
  if (!args[0] || !args[1]) usage(1);
  const source = readJson(args[0]);
  if (!isV2(source)) {
    console.error('compile expects a schemaVersion 0.2 solution.');
    process.exit(1);
  }
  const validation = validateV2Solution(source);
  if (!validation.ok) {
    console.error(JSON.stringify(validation, null, 2));
    process.exit(1);
  }
  const compiled = compileV2Solution(source);
  const output = path.resolve(args[1]);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(compiled, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, output, blocks: compiled.blocks.length }, null, 2));
  process.exit(0);
}

if (command === 'concerns') {
  const packs = listConcernPacks().map(pack => ({
    id: pack.id,
    title: pack.title,
    questions: (pack.questions ?? []).map(question => ({ id: question.id, question: question.question }))
  }));
  console.log(JSON.stringify({ ok: true, packs }, null, 2));
  process.exit(0);
}

if (command === 'diagrams') {
  if (!args[0] || !args[1]) usage(1);
  const source = readJson(args[0]);
  const sourceReview = isV2(source) ? reviewV2Solution(source) : reviewSolution(source);
  if (!sourceReview.ok) {
    console.error(JSON.stringify(sourceReview, null, 2));
    process.exit(1);
  }
  const solution = normalizeSolution(source);
  const outDir = path.resolve(args[1]);
  fs.mkdirSync(outDir, { recursive: true });
  const manifestFile = path.join(outDir, 'manifest.json');
  const previousManifest = readManifest(manifestFile);
  const manifest = [];
  for (const block of solution.blocks ?? []) {
    const rep = block.representation ?? {};
    if (!['architecture','sequence','workflow','dataflow','lifecycle','er','gantt'].includes(rep.kind)) continue;
    let sourceFile = null;
    const expectedHtml = `${block.id}.html`;
    const sourceHash = hashSpec(rep.spec ?? {});
    const previous = previousManifest.diagrams.find(item => item?.id === block.id);
    if (!previous || previous.sourceHash !== sourceHash) {
      removeIfExists(path.join(outDir, expectedHtml));
      removeIfExists(path.join(outDir, `${block.id}.receipt.json`));
    }
    if (rep.engine === 'archify') {
      sourceFile = `${block.id}.${rep.kind}.json`;
      fs.writeFileSync(path.join(outDir, sourceFile), JSON.stringify(rep.spec, null, 2) + '\n');
    } else if (rep.engine === 'mermaid' && typeof rep.spec?.source === 'string') {
      sourceFile = `${block.id}.${rep.kind}.mmd`;
      fs.writeFileSync(path.join(outDir, sourceFile), rep.spec.source.trim() + '\n');
    }
    manifest.push({ id: block.id, kind: rep.kind, engine: rep.engine, reason: rep.reason, sourceFile, sourceHash, expectedHtml });
  }
  fs.writeFileSync(manifestFile, JSON.stringify({ solution: solution.title, diagrams: manifest }, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, outputDir: outDir, diagrams: manifest }, null, 2));
  process.exit(0);
}

if (command === 'render') {
  if (!args[0] || !args[1]) usage(1);
  const diagramFlag = args.indexOf('--diagram-dir');
  if (diagramFlag >= 0 && !args[diagramFlag + 1]) usage(1);
  const diagramDir = diagramFlag >= 0 ? path.resolve(args[diagramFlag + 1]) : null;
  const solution = readJson(args[0]);
  const html = isV2(solution)
    ? renderV2SolutionHtml(solution, { diagramDir })
    : renderSolutionHtml(solution, { diagramDir });
  const output = path.resolve(args[1]);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html);
  console.log(JSON.stringify({ ok: true, schemaVersion: solution.schemaVersion, output, bytes: Buffer.byteLength(html), diagramDir }, null, 2));
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
usage(1);
