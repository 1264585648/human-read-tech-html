import fs from 'node:fs';
import path from 'node:path';
import { reviewSolution } from './core.mjs';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function renderInline(value) {
  if (Array.isArray(value)) return `<ul>${value.map(x => `<li>${esc(typeof x === 'string' ? x : JSON.stringify(x))}</li>`).join('')}</ul>`;
  if (value && typeof value === 'object') {
    if (typeof value.body === 'string') {
      const items = Array.isArray(value.items) ? `<ul>${value.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
      return `<p>${esc(value.body)}</p>${items}`;
    }
    return `<pre>${esc(JSON.stringify(value, null, 2))}</pre>`;
  }
  return `<p>${esc(value)}</p>`;
}

function normalizeColumns(columns) {
  return columns.map(c => typeof c === 'string' ? { key: c, label: c } : c);
}

function renderTable(content) {
  const cols = normalizeColumns(content.columns ?? []);
  const head = cols.map(c => `<th>${esc(c.label ?? c.key)}</th>`).join('');
  const rows = (content.rows ?? []).map(row => {
    const cells = cols.map((c, index) => {
      const value = Array.isArray(row) ? row[index] : row?.[c.key];
      return `<td>${Array.isArray(value) ? value.map(esc).join('<br>') : esc(value ?? '')}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderCards(content) {
  return `<div class="cards">${(content.cards ?? []).map(card => `<article class="mini-card">${card.tag ? `<span class="tag">${esc(card.tag)}</span>` : ''}<h3>${esc(card.title ?? '')}</h3><p>${esc(card.body ?? '')}</p></article>`).join('')}</div>`;
}

function archifyArchitectureFallback(spec) {
  const components = spec.components ?? [];
  const connections = spec.connections ?? [];
  return `<div class="diagram-fallback"><div class="diagram-grid">${components.map(c => `<div class="node"><span>${esc(c.type ?? 'component')}</span><strong>${esc(c.label)}</strong>${c.sublabel ? `<small>${esc(c.sublabel)}</small>` : ''}</div>`).join('')}</div><div class="edge-list">${connections.map(e => `<div><code>${esc(e.from)}</code><b>→</b><code>${esc(e.to)}</code>${e.label ? `<span>${esc(e.label)}</span>` : ''}</div>`).join('')}</div></div>`;
}

function archifySequenceFallback(spec) {
  const labels = Object.fromEntries((spec.participants ?? []).map(p => [p.id, p.label]));
  return `<div class="sequence-list">${(spec.messages ?? []).map((m, i) => `<div class="sequence-step"><span class="step-no">${i + 1}</span><strong>${esc(labels[m.from] ?? m.from)}</strong><b>→</b><strong>${esc(labels[m.to] ?? m.to)}</strong><span>${esc(m.label)}</span>${m.note ? `<small>${esc(m.note)}</small>` : ''}</div>`).join('')}</div>`;
}

function renderDiagramFallback(block) {
  const rep = block.representation;
  const spec = rep.spec ?? {};
  if (rep.engine === 'archify' && rep.kind === 'architecture') return archifyArchitectureFallback(spec);
  if (rep.engine === 'archify' && rep.kind === 'sequence') return archifySequenceFallback(spec);
  if (rep.engine === 'mermaid' && typeof spec.source === 'string') return `<div class="diagram-source"><p>Mermaid typed source（未预编译时保留可核验源码）</p><pre>${esc(spec.source)}</pre></div>`;
  return `<pre>${esc(JSON.stringify(spec, null, 2))}</pre>`;
}

function renderBlock(block, embeddedDiagram = null) {
  const rep = block.representation;
  let body = '';
  if (embeddedDiagram) body = `<div class="embedded-diagram"><iframe title="${esc(block.title ?? block.id)}" srcdoc="${esc(embeddedDiagram)}"></iframe></div>`;
  else if (rep.kind === 'text') body = renderInline(block.content);
  else if (rep.kind === 'table') body = renderTable(block.content);
  else if (rep.kind === 'cards') body = renderCards(block.content);
  else body = renderDiagramFallback(block);

  return `<section id="${esc(block.id)}" class="section"><div class="section-head"><div><span class="eyebrow">${esc(block.type.replaceAll('_',' '))}</span><h2>${esc(block.title ?? block.type)}</h2></div><span class="importance ${esc(block.importance)}">${esc(block.importance)}</span></div><p class="why">为什么保留：${esc(block.reason)}</p>${body}</section>`;
}

function loadDiagramArtifact(diagramDir, blockId) {
  if (!diagramDir) return null;
  const file = path.join(diagramDir, `${blockId}.html`);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function evidenceGroup(title, items, className) {
  if (!items?.length) return '';
  return `<div class="evidence-group ${className}"><h3>${esc(title)}</h3>${items.map(x => `<p>${esc(x.text)}${x.source ? `<small>${esc(x.source)}</small>` : ''}</p>`).join('')}</div>`;
}

export function renderSolutionHtml(solution, options = {}) {
  const review = reviewSolution(solution);
  if (!review.ok) throw new Error(`Cannot render invalid solution: ${review.errors.map(e => e.message).join('; ')}`);
  const counts = review.counts;
  const meta = solution.meta ?? {};
  const nav = (solution.blocks ?? []).map(b => `<a href="#${esc(b.id)}">${esc(b.title ?? b.type)}</a>`).join('');
  const blocks = (solution.blocks ?? []).map(b => renderBlock(b, loadDiagramArtifact(options.diagramDir, b.id))).join('');
  const ev = solution.evidence ?? { facts:[], assumptions:[], unknowns:[] };
  const evidenceHtml = [
    evidenceGroup('已知事实', ev.facts, 'facts'),
    evidenceGroup('明确假设', ev.assumptions, 'assumptions'),
    evidenceGroup('待确认', ev.unknowns, 'unknowns')
  ].join('');
  const warnings = review.warnings.length ? `<div class="review-note"><strong>交付前提醒</strong>${review.warnings.map(w => `<p>${esc(w.message)}</p>`).join('')}</div>` : '';

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(solution.title)}</title><style>
:root{font-family:Inter,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;color:#18202a;background:#f5f7fa;line-height:1.6}*{box-sizing:border-box}body{margin:0}.layout{display:grid;grid-template-columns:240px minmax(0,1fr);max-width:1480px;margin:auto}.side{position:sticky;top:0;height:100vh;padding:28px 18px;border-right:1px solid #e5e9ef;background:#fbfcfd}.brand{font-weight:800;font-size:18px;margin-bottom:20px}.side nav{display:flex;flex-direction:column;gap:4px}.side a{color:#566170;text-decoration:none;padding:8px 10px;border-radius:8px;font-size:14px}.side a:hover{background:#eef2f6;color:#111}.main{padding:34px 48px 80px;min-width:0}.hero{background:white;border:1px solid #e3e8ef;border-radius:16px;padding:28px;box-shadow:0 8px 24px rgba(24,32,42,.04)}.hero h1{font-size:32px;line-height:1.2;margin:6px 0 10px}.summary{font-size:17px;color:#4b5665;max-width:920px}.meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.pill,.importance,.tag{display:inline-flex;align-items:center;border:1px solid #dfe5ec;border-radius:999px;padding:4px 9px;font-size:12px;background:#f8fafc}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:20px}.stat{background:#f8fafc;border-radius:12px;padding:12px}.stat b{display:block;font-size:18px}.stat span{font-size:12px;color:#687382}.section{background:white;border:1px solid #e3e8ef;border-radius:14px;padding:24px;margin-top:18px;scroll-margin-top:18px}.section-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.section h2{font-size:22px;margin:2px 0 4px}.eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7b8795}.why{margin:4px 0 18px;padding:9px 12px;background:#f7f9fb;border-left:3px solid #cfd7e1;color:#5f6977;font-size:13px}.importance.high{background:#edf7f0}.importance.medium{background:#fff8e8}.importance.low{background:#f7f7f7}.table-wrap{overflow:auto;border:1px solid #e4e9ef;border-radius:10px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:11px 12px;border-bottom:1px solid #e9edf2;vertical-align:top}th{background:#f7f9fb;color:#4c5664}tr:last-child td{border-bottom:0}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.mini-card{border:1px solid #e4e9ef;border-radius:12px;padding:14px}.mini-card h3{margin:6px 0 4px;font-size:16px}.mini-card p{margin:0;color:#596474}.diagram-fallback{border:1px dashed #cfd7e1;border-radius:12px;padding:16px;background:#fbfcfd}.diagram-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}.node{padding:14px;border:1px solid #dce3ea;border-radius:12px;background:#fff}.node span,.node small{display:block;color:#74808f;font-size:11px}.node strong{display:block;margin:3px 0}.edge-list{display:flex;flex-direction:column;gap:7px;margin-top:14px}.edge-list div{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px}.edge-list span{color:#687382}.sequence-list{display:flex;flex-direction:column;gap:8px}.sequence-step{display:grid;grid-template-columns:32px minmax(90px,auto) 18px minmax(90px,auto) 1fr;gap:8px;align-items:center;border:1px solid #e3e8ef;border-radius:10px;padding:10px 12px}.sequence-step small{grid-column:5;color:#74808f}.step-no{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#eef2f6;font-size:12px}.diagram-source pre,pre{white-space:pre-wrap;word-break:break-word;background:#111820;color:#e6edf3;border-radius:10px;padding:14px;overflow:auto}.embedded-diagram iframe{width:100%;height:650px;border:1px solid #e3e8ef;border-radius:12px;background:white}.evidence{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}.evidence-group{background:white;border:1px solid #e3e8ef;border-radius:12px;padding:16px}.evidence-group h3{margin:0 0 10px;font-size:15px}.evidence-group p{font-size:13px;margin:8px 0}.evidence-group small{display:block;color:#7a8592}.review-note{margin-top:18px;padding:14px 16px;border:1px solid #eadfbc;background:#fffaf0;border-radius:12px}.review-note p{margin:4px 0;font-size:13px}.footer{margin-top:24px;color:#7a8592;font-size:12px;text-align:center}@media(max-width:900px){.layout{display:block}.side{position:relative;height:auto;border-right:0;border-bottom:1px solid #e5e9ef}.side nav{flex-direction:row;overflow:auto}.side a{white-space:nowrap}.main{padding:22px 16px 60px}.stats{grid-template-columns:repeat(2,1fr)}.evidence{grid-template-columns:1fr}.sequence-step{grid-template-columns:28px 1fr 18px 1fr}.sequence-step>span:nth-last-child(-n+2){grid-column:2/-1}.embedded-diagram iframe{height:520px}}
</style></head><body><div class="layout"><aside class="side"><div class="brand">Human Read Tech HTML</div><nav>${nav}<a href="#evidence">证据与待确认</a></nav></aside><main class="main"><header class="hero"><span class="eyebrow">technical solution</span><h1>${esc(solution.title)}</h1><div class="summary">${esc(solution.summary ?? '')}</div><div class="meta"><span class="pill">压力：${esc(solution.scoping.pressure)}</span><span class="pill">完整设计：${solution.scoping.fullDesignRequired ? '是' : '否'}</span>${meta.status ? `<span class="pill">状态：${esc(meta.status)}</span>` : ''}${meta.version ? `<span class="pill">版本：${esc(meta.version)}</span>` : ''}${meta.confidence ? `<span class="pill">置信度：${esc(meta.confidence)}</span>` : ''}</div><div class="stats"><div class="stat"><b>${counts.blocks}</b><span>内容块</span></div><div class="stat"><b>${counts.diagrams}</b><span>必要图</span></div><div class="stat"><b>${counts.tables}</b><span>结构表</span></div><div class="stat"><b>${review.warnings.length}</b><span>Review 提醒</span></div></div></header>${blocks}<section id="evidence" class="section"><div class="section-head"><div><span class="eyebrow">evidence</span><h2>证据、假设与待确认</h2></div></div><div class="evidence">${evidenceHtml || '<p>无额外证据项。</p>'}</div></section>${warnings}<div class="footer">Generated from solution.json · HTML is a derived artifact, not the source of truth.</div></main></div></body></html>`;
}
