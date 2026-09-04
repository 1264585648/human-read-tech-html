#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { validateSolution, reviewSolution, simplifySolution } from '../src/core.mjs';
import { renderSolutionHtml } from '../src/render.mjs';

function usage(code = 0) {
  console.log(`Human Read Tech HTML CLI\n\nUsage:\n  hrth validate <solution.json>\n  hrth review <solution.json>\n  hrth simplify <solution.json> <output.json>\n  hrth diagrams <solution.json> <output-dir>\n  hrth render <solution.json> <output.html> [--diagram-dir <dir>]\n`);
  process.exit(code);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
}

const [, , command, ...args] = process.argv;
if (!command || command === '-h' || command === '--help') usage(0);

if (command === 'validate') {
  if (!args[0]) usage(1);
  const result = validateSolution(readJson(args[0]));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

if (command === 'review') {
  if (!args[0]) usage(1);
  const result = reviewSolution(readJson(args[0]));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

if (command === 'simplify') {
  if (!args[0] || !args[1]) usage(1);
  const { solution, removed } = simplifySolution(readJson(args[0]));
  fs.writeFileSync(path.resolve(args[1]), JSON.stringify(solution, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, output: path.resolve(args[1]), removed }, null, 2));
  process.exit(0);
}

if (command === 'diagrams') {
  if (!args[0] || !args[1]) usage(1);
  const solution = readJson(args[0]);
  const review = reviewSolution(solution);
  if (!review.ok) {
    console.error(JSON.stringify(review, null, 2));
    process.exit(1);
  }
  const outDir = path.resolve(args[1]);
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = [];
  for (const block of solution.blocks ?? []) {
    const rep = block.representation ?? {};
    if (!['architecture','sequence','workflow','dataflow','lifecycle','er','gantt'].includes(rep.kind)) continue;
    let sourceFile = null;
    if (rep.engine === 'archify') {
      sourceFile = `${block.id}.${rep.kind}.json`;
      fs.writeFileSync(path.join(outDir, sourceFile), JSON.stringify(rep.spec, null, 2) + '\n');
    } else if (rep.engine === 'mermaid' && typeof rep.spec?.source === 'string') {
      sourceFile = `${block.id}.${rep.kind}.mmd`;
      fs.writeFileSync(path.join(outDir, sourceFile), rep.spec.source.trim() + '\n');
    }
    manifest.push({ id: block.id, kind: rep.kind, engine: rep.engine, reason: rep.reason, sourceFile, expectedHtml: `${block.id}.html` });
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ solution: solution.title, diagrams: manifest }, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, outputDir: outDir, diagrams: manifest }, null, 2));
  process.exit(0);
}

if (command === 'render') {
  if (!args[0] || !args[1]) usage(1);
  const diagramFlag = args.indexOf('--diagram-dir');
  const diagramDir = diagramFlag >= 0 ? path.resolve(args[diagramFlag + 1]) : null;
  const solution = readJson(args[0]);
  const html = renderSolutionHtml(solution, { diagramDir });
  const output = path.resolve(args[1]);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html);
  console.log(JSON.stringify({ ok: true, output, bytes: Buffer.byteLength(html), diagramDir }, null, 2));
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
usage(1);
