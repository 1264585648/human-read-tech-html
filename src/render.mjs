import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { reviewSolution, planReading } from './core.mjs';

const EMPHASIS_BLOCK_TYPES = new Set(['architecture', 'decisions']);
const COLLAPSED_GROUPS = new Set(['details', 'appendix']);

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function hashSpec(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
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
  return `<div class="cards">${(content.cards ?? []).map(card => `<article class="mini-card">${card.tag ? `<span class="tag">${esc(card.tag)}</span>` : ''}<h4>${esc(card.title ?? '')}</h4><p>${esc(card.body ?? '')}</p></article>`).join('')}</div>`;
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

function buildEvidenceIndex(evidence = {}) {
  const index = new Map();
  for (const group of ['facts', 'assumptions', 'unknowns']) {
    for (const item of evidence[group] ?? []) {
      if (item?.id) index.set(item.id, item);
    }
  }
  return index;
}

function renderEvidenceRefs(sourceRefs, evidenceIndex) {
  if (!Array.isArray(sourceRefs) || !sourceRefs.length) return '';
  const refs = sourceRefs.map(ref => {
    const item = evidenceIndex.get(ref);
    const label = item?.text?.trim() || ref;
    const details = [`原始 ID：${ref}`];
    if (item?.source) details.push(`来源：${item.source}`);
    return `<span class="source-ref" title="${esc(details.join(' · '))}">${esc(label)}</span>`;
  }).join('<span class="source-ref-sep">/</span>');
  return `<div class="source-refs"><span class="source-refs-label">依据：</span>${refs}</div>`;
}

function renderImportance(level) {
  if (level === 'high') {
    return `<span class="importance-high" title="重要性：high" aria-label="重要性 high"><span class="importance-dot"></span></span>`;
  }
  return `<span class="importance ${esc(level)}">${esc(level)}</span>`;
}

function renderBlock(block, artifact = null, evidenceIndex = new Map()) {
  const rep = block.representation;
  let body = '';
  if (artifact?.html) {
    const title = esc(block.title ?? block.id);
    body = `<div class="embedded-diagram" data-diagram-root><div class="diagram-frame-actions"><button type="button" class="diagram-fullscreen" data-diagram-fullscreen aria-label="全屏查看 ${title}" aria-pressed="false">⛶ 全屏查看</button></div><iframe sandbox="allow-scripts" allow="fullscreen" allowfullscreen referrerpolicy="no-referrer" title="${title}" srcdoc="${esc(artifact.html)}"></iframe></div>`;
  }
  else if (rep.kind === 'text') body = renderInline(block.content);
  else if (rep.kind === 'table') body = renderTable(block.content);
  else if (rep.kind === 'cards') body = renderCards(block.content);
  else body = renderDiagramFallback(block);

  const refs = renderEvidenceRefs(block.sourceRefs, evidenceIndex);
  const artifactWarning = artifact?.issue ? `<p class="artifact-warning">图表产物未嵌入：${esc(artifact.issue)} 已使用语义降级视图。</p>` : '';
  const blockClass = EMPHASIS_BLOCK_TYPES.has(block.type) ? 'content-block content-block-emphasis' : 'content-block';

  return `<article id="${esc(block.id)}" class="${blockClass}" data-reading-role="${esc(block.reading?.role ?? 'detail')}"><div class="block-head"><div><span class="eyebrow">${esc(block.type.replaceAll('_',' '))}</span><h3>${esc(block.title ?? block.type)}</h3></div>${renderImportance(block.importance)}</div>${refs}${artifactWarning}${body}</article>`;
}

function loadDiagramManifest(diagramDir) {
  if (!diagramDir) return null;
  const file = path.join(diagramDir, 'manifest.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function loadDiagramArtifact(diagramDir, manifest, block) {
  if (!diagramDir) return { html: null, issue: null };
  if (!manifest || !Array.isArray(manifest.diagrams)) return { html: null, issue: 'diagram manifest 缺失或不可读。' };
  const entry = manifest.diagrams.find(item => item?.id === block.id);
  if (!entry) return { html: null, issue: 'manifest 中没有当前 Block 的图表记录。' };
  const currentHash = hashSpec(block.representation?.spec ?? {});
  if (entry.sourceHash !== currentHash) return { html: null, issue: '图表 source hash 与当前 solution.json 不一致，产物可能已过期。' };
  const file = path.join(diagramDir, entry.expectedHtml ?? `${block.id}.html`);
  if (!fs.existsSync(file)) return { html: null, issue: '未找到已编译 HTML 产物。' };

  const receiptFile = path.join(diagramDir, `${block.id}.receipt.json`);
  if (fs.existsSync(receiptFile)) {
    try {
      const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
      if (receipt.sourceHash !== currentHash || receipt.validated !== true) {
        return { html: null, issue: 'diagram receipt 与当前 source 不一致或未标记 validated=true。' };
      }
    } catch {
      return { html: null, issue: 'diagram receipt 不可读。' };
    }
  }

  return { html: fs.readFileSync(file, 'utf8'), issue: null };
}

function evidenceGroup(title, items, className) {
  if (!items?.length) return '';
  return `<div class="evidence-group ${className}"><h4>${esc(title)}</h4>${items.map(x => `<div class="evidence-item" title="${esc(`原始 ID：${x.id}`)}"><p>${esc(x.text)}</p>${x.source ? `<small>${esc(x.source)}</small>` : ''}</div>`).join('')}</div>`;
}

function renderBrief(solution) {
  const brief = solution.brief ?? {};
  const bottomLine = brief.bottomLine || solution.summary || '';
  const changes = Array.isArray(brief.keyChanges) ? brief.keyChanges : [];
  const risks = Array.isArray(brief.keyRisks) ? brief.keyRisks : [];
  const changesHtml = changes.length
    ? `<div class="brief-column"><span class="brief-label">核心变化</span><ul>${changes.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`
    : '';
  const riskHtml = risks.length
    ? `<div class="brief-column"><span class="brief-label">主要风险 / 约束</span><ul>${risks.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`
    : '';
  const impactHtml = brief.impact ? `<div class="brief-note"><span>影响</span><p>${esc(brief.impact)}</p></div>` : '';
  const deliveryHtml = brief.delivery ? `<div class="brief-note"><span>上线 / 验证</span><p>${esc(brief.delivery)}</p></div>` : '';
  const grid = changesHtml || riskHtml ? `<div class="brief-grid">${changesHtml}${riskHtml}</div>` : '';
  const notes = impactHtml || deliveryHtml ? `<div class="brief-notes">${impactHtml}${deliveryHtml}</div>` : '';
  return `<div class="bottom-line"><span class="brief-label">方案结论</span><p>${esc(bottomLine)}</p></div>${grid}${notes}`;
}

function renderReadingGroup(group, artifacts, evidenceIndex, evidenceHtml = '') {
  const blocksHtml = group.blocks.map(block => renderBlock(block, artifacts.get(block.id), evidenceIndex)).join('');
  const appendixEvidence = group.id === 'appendix' && evidenceHtml
    ? `<div class="appendix-evidence"><div class="group-subhead"><span class="eyebrow">evidence</span><h3>证据、假设与待确认</h3></div><div class="evidence">${evidenceHtml}</div></div>`
    : '';
  const body = `${blocksHtml}${appendixEvidence}`;
  const count = group.blocks.length + (appendixEvidence ? 1 : 0);

  if (COLLAPSED_GROUPS.has(group.id)) {
    return `<details id="group-${esc(group.id)}" class="reading-group reading-group-collapsed"><summary><span>${esc(group.title)}</span><small>${count} 项 · 按需展开</small></summary><div class="reading-group-body">${body}</div></details>`;
  }

  return `<section id="group-${esc(group.id)}" class="reading-group reading-group-core"><div class="group-head"><span class="group-index">${esc(group.id)}</span><h2>${esc(group.title)}</h2></div><div class="reading-group-body">${body}</div></section>`;
}

export function renderSolutionHtml(solution, options = {}) {
  const review = reviewSolution(solution);
  if (!review.ok) throw new Error(`Cannot render invalid solution: ${review.errors.map(e => e.message).join('; ')}`);
  const meta = solution.meta ?? {};
  const manifest = loadDiagramManifest(options.diagramDir);
  const artifacts = new Map();
  for (const block of solution.blocks ?? []) {
    const kind = block?.representation?.kind;
    if (['architecture','sequence','workflow','dataflow','lifecycle','er','gantt'].includes(kind)) {
      artifacts.set(block.id, loadDiagramArtifact(options.diagramDir, manifest, block));
    }
  }

  const artifactWarnings = [...artifacts.values()].filter(x => x.issue).map(x => x.issue);
  const ev = solution.evidence ?? { facts:[], assumptions:[], unknowns:[] };
  const evidenceIndex = buildEvidenceIndex(ev);
  const evidenceHtml = [
    evidenceGroup('已知事实', ev.facts, 'facts'),
    evidenceGroup('明确假设', ev.assumptions, 'assumptions'),
    evidenceGroup('待确认', ev.unknowns, 'unknowns')
  ].join('');

  const readingPlan = planReading(solution);
  const groups = readingPlan.groups.map(group => ({ ...group, blocks: [...group.blocks] }));
  const hasEvidence = Boolean(evidenceHtml);
  if (hasEvidence && !groups.some(group => group.id === 'appendix')) {
    groups.push({ id: 'appendix', title: '依据与附录', blocks: [] });
  }

  const nav = groups.map(group => `<a data-nav-link href="#group-${esc(group.id)}">${esc(group.title)}</a>`).join('');
  const groupHtml = groups.map(group => renderReadingGroup(group, artifacts, evidenceIndex, evidenceHtml)).join('');
  const allWarnings = [...review.warnings.map(w => w.message), ...artifactWarnings];
  const warnings = allWarnings.length ? `<details class="review-note"><summary>交付前提醒 · ${allWarnings.length}</summary>${allWarnings.map(message => `<p>${esc(message)}</p>`).join('')}</details>` : '';

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(solution.title)}</title><style>
:root{font-family:Inter,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;color:#18202a;background:#f5f7fa;line-height:1.65}*{box-sizing:border-box}body{margin:0}.layout{display:grid;grid-template-columns:230px minmax(0,1fr);max-width:1480px;margin:auto}.side{position:sticky;top:0;height:100vh;padding:28px 18px;border-right:1px solid #e5e9ef;background:#fbfcfd}.brand{font-weight:800;font-size:18px;margin-bottom:18px}.nav-group{margin:0}.nav-group summary{cursor:pointer;list-style:none;color:#8993a1;font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:7px 10px;margin-bottom:4px;user-select:none}.nav-group summary::-webkit-details-marker{display:none}.nav-group summary::before{content:'▾';display:inline-block;margin-right:6px;transition:transform .15s ease}.nav-group:not([open]) summary::before{transform:rotate(-90deg)}.side nav{display:flex;flex-direction:column;gap:3px}.side a{position:relative;color:#65707e;text-decoration:none;padding:8px 10px 8px 12px;border-radius:7px;font-size:13px;transition:background .15s ease,color .15s ease}.side a:hover{background:#f1f4f7;color:#283442}.side a.is-active{background:#eef3f8;color:#1f3852;font-weight:600;box-shadow:inset 3px 0 0 #86a7c8}.main{padding:34px 48px 80px;min-width:0}.hero{background:white;border:1px solid #e3e8ef;border-radius:16px;padding:30px;box-shadow:0 8px 24px rgba(24,32,42,.04)}.hero h1{font-size:32px;line-height:1.2;margin:6px 0 14px}.hero-meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px}.pill,.importance,.tag{display:inline-flex;align-items:center;border:1px solid #dfe5ec;border-radius:999px;padding:4px 9px;font-size:12px;background:#f8fafc}.bottom-line{max-width:980px}.brief-label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#768292;font-weight:700;margin-bottom:5px}.bottom-line p{font-size:19px;line-height:1.55;margin:0;color:#273341;font-weight:650}.brief-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:22px;padding-top:20px;border-top:1px solid #edf1f5}.brief-column ul{margin:7px 0 0;padding-left:20px}.brief-column li{margin:5px 0;color:#4d5968}.brief-notes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}.brief-note{padding:12px 14px;border-radius:10px;background:#f7f9fb;border:1px solid #edf1f5}.brief-note span{font-size:11px;font-weight:700;color:#718093}.brief-note p{margin:3px 0 0;color:#4c5967;font-size:13px}.reading-group{scroll-margin-top:24px;margin-top:28px}.reading-group-core{padding-top:2px}.group-head{display:flex;align-items:baseline;gap:10px;padding:0 2px 9px;border-bottom:1px solid #e5eaf0}.group-head h2{font-size:23px;margin:0}.group-index{font-size:11px;color:#8a95a3;text-transform:uppercase;letter-spacing:.08em}.reading-group-body{display:flex;flex-direction:column;gap:14px;margin-top:14px}.reading-group-collapsed{background:rgba(255,255,255,.78);border:1px solid #e6ebf0;border-radius:12px;overflow:hidden}.reading-group-collapsed>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:17px 20px;font-size:18px;font-weight:700;color:#344152}.reading-group-collapsed>summary::-webkit-details-marker{display:none}.reading-group-collapsed>summary::before{content:'▸';color:#8995a3;margin-right:2px}.reading-group-collapsed[open]>summary::before{content:'▾'}.reading-group-collapsed>summary small{margin-left:auto;font-size:12px;font-weight:500;color:#8a95a3}.reading-group-collapsed>.reading-group-body{padding:0 18px 18px;margin-top:0;border-top:1px solid #eef1f4}.content-block{background:rgba(255,255,255,.76);border:1px solid #edf1f5;border-radius:12px;padding:22px}.content-block-emphasis{background:#fff;border-color:#dfe6ee;box-shadow:0 5px 18px rgba(24,32,42,.035)}.block-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:10px}.content-block h3{font-size:20px;margin:2px 0 0}.eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7b8795}.source-refs{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:0 0 16px;color:#74808f;font-size:12px}.source-refs-label{color:#7d8794}.source-ref{display:inline-flex;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 8px;border-radius:999px;background:#f1f4f7;color:#536171;cursor:help}.source-ref-sep{color:#b4bcc6}.artifact-warning{margin:0 0 14px;padding:9px 12px;background:#fff8e8;border:1px solid #eadfbc;border-radius:8px;color:#705b24;font-size:13px}.importance-high{display:inline-grid;place-items:center;width:20px;height:20px;opacity:.68}.importance-dot{display:block;width:7px;height:7px;border-radius:50%;background:#75a98a;box-shadow:0 0 0 3px rgba(117,169,138,.10)}.importance.medium{background:#fff8e8}.importance.low{background:#f7f7f7}.table-wrap{overflow:auto;border:1px solid #e4e9ef;border-radius:10px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:11px 12px;border-bottom:1px solid #e9edf2;vertical-align:top}th{background:#f7f9fb;color:#4c5664}tbody tr:nth-child(even){background:#fcfdfe}tbody tr:hover{background:#f8fafc}tr:last-child td{border-bottom:0}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.mini-card{border:1px solid #e4e9ef;border-radius:12px;padding:14px;background:#fff}.mini-card h4{margin:6px 0 4px;font-size:16px}.mini-card p{margin:0;color:#596474}.diagram-fallback{border:1px dashed #cfd7e1;border-radius:12px;padding:16px;background:#fbfcfd}.diagram-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}.node{padding:14px;border:1px solid #dce3ea;border-radius:12px;background:#fff}.node span,.node small{display:block;color:#74808f;font-size:11px}.node strong{display:block;margin:3px 0}.edge-list{display:flex;flex-direction:column;gap:7px;margin-top:14px}.edge-list div{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px}.edge-list span{color:#687382}.sequence-list{display:flex;flex-direction:column;gap:8px}.sequence-step{display:grid;grid-template-columns:32px minmax(90px,auto) 18px minmax(90px,auto) 1fr;gap:8px;align-items:center;border:1px solid #e3e8ef;border-radius:10px;padding:10px 12px}.sequence-step small{grid-column:5;color:#74808f}.step-no{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#eef2f6;font-size:12px}.diagram-source pre,pre{white-space:pre-wrap;word-break:break-word;background:#111820;color:#e6edf3;border-radius:10px;padding:14px;overflow:auto}.embedded-diagram{background:white;border:1px solid #e3e8ef;border-radius:12px;overflow:hidden}.diagram-frame-actions{display:flex;justify-content:flex-end;align-items:center;min-height:44px;padding:7px 9px;border-bottom:1px solid #e8edf2;background:#fbfcfd}.diagram-fullscreen{appearance:none;border:1px solid #d8e0e8;border-radius:8px;background:white;color:#344050;padding:6px 10px;font:inherit;font-size:12px;line-height:1.4;cursor:pointer}.diagram-fullscreen:hover{background:#f3f6f9;border-color:#c5d0dc}.diagram-fullscreen:focus-visible{outline:2px solid #7ba6d8;outline-offset:2px}.embedded-diagram iframe{display:block;width:100%;height:650px;border:0;background:white}.embedded-diagram:fullscreen{width:100vw;height:100vh;display:flex;flex-direction:column;border:0;border-radius:0;background:white}.embedded-diagram:fullscreen .diagram-frame-actions{flex:0 0 auto}.embedded-diagram:fullscreen iframe{flex:1 1 auto;height:auto;min-height:0}.embedded-diagram:-webkit-full-screen{width:100vw;height:100vh;display:flex;flex-direction:column;border:0;border-radius:0;background:white}.embedded-diagram:-webkit-full-screen .diagram-frame-actions{flex:0 0 auto}.embedded-diagram:-webkit-full-screen iframe{flex:1 1 auto;height:auto;min-height:0}.appendix-evidence{padding:4px 2px}.group-subhead{margin:8px 0 12px}.group-subhead h3{font-size:18px;margin:2px 0}.evidence{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.evidence-group{background:white;border:1px solid #e7ebf0;border-radius:12px;padding:16px}.evidence-group h4{margin:0 0 10px;font-size:15px}.evidence-item{padding:8px 0;border-bottom:1px solid #f0f2f5;cursor:help}.evidence-item:last-child{border-bottom:0}.evidence-item p{font-size:13px;margin:0}.evidence-item small{display:block;color:#7a8592;margin-top:2px}.review-note{margin-top:24px;padding:0;border:1px solid #eadfbc;background:#fffaf0;border-radius:12px;overflow:hidden}.review-note summary{cursor:pointer;padding:12px 15px;font-weight:650;color:#6b5a2a}.review-note p{margin:0;padding:6px 15px;font-size:13px}.review-note p:last-child{padding-bottom:14px}.footer{margin-top:28px;color:#7a8592;font-size:12px;text-align:center}@media(max-width:900px){.layout{display:block}.side{position:relative;height:auto;border-right:0;border-bottom:1px solid #e5e9ef}.side nav{flex-direction:row;overflow:auto}.side a{white-space:nowrap}.main{padding:22px 16px 60px}.brief-grid,.brief-notes{grid-template-columns:1fr}.evidence{grid-template-columns:1fr}.sequence-step{grid-template-columns:28px 1fr 18px 1fr}.sequence-step>span:nth-last-child(-n+2){grid-column:2/-1}.embedded-diagram iframe{height:520px}.embedded-diagram:fullscreen iframe,.embedded-diagram:-webkit-full-screen iframe{height:auto}.reading-group-collapsed>summary{align-items:flex-start}.reading-group-collapsed>summary small{white-space:nowrap}}
</style></head><body><div class="layout"><aside class="side"><div class="brand">Human Read Tech HTML</div><details class="nav-group" open><summary>阅读目录</summary><nav>${nav}</nav></details></aside><main class="main"><header class="hero"><span class="eyebrow">technical solution</span><h1>${esc(solution.title)}</h1><div class="hero-meta">${meta.scope ? `<span class="pill">范围：${esc(meta.scope)}</span>` : ''}${meta.status ? `<span class="pill">状态：${esc(meta.status)}</span>` : ''}${meta.confidence ? `<span class="pill">置信度：${esc(meta.confidence)}</span>` : ''}<span class="pill">设计压力：${esc(solution.scoping.pressure)}</span></div>${renderBrief(solution)}</header>${groupHtml}${warnings}<div class="footer">Generated from solution.json · HTML is a derived artifact, not the source of truth.</div></main></div><script>
(() => {
  const currentFullscreen = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const syncFullscreenButtons = () => {
    const active = currentFullscreen();
    document.querySelectorAll('[data-diagram-root]').forEach(root => {
      const button = root.querySelector('[data-diagram-fullscreen]');
      if (!button) return;
      const isActive = active === root;
      button.textContent = isActive ? '⤢ 退出全屏' : '⛶ 全屏查看';
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-diagram-fullscreen]');
    if (button) {
      const root = button.closest('[data-diagram-root]');
      if (!root) return;
      try {
        if (currentFullscreen() === root) {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          if (exit) await exit.call(document);
          return;
        }
        const request = root.requestFullscreen || root.webkitRequestFullscreen;
        if (request) await request.call(root);
      } catch (error) {
        console.warn('Unable to toggle diagram fullscreen.', error);
      }
      return;
    }

    const navLink = event.target.closest('[data-nav-link]');
    if (navLink) {
      const target = document.getElementById(navLink.getAttribute('href').slice(1));
      if (target?.tagName === 'DETAILS') target.open = true;
    }
  });

  document.addEventListener('fullscreenchange', syncFullscreenButtons);
  document.addEventListener('webkitfullscreenchange', syncFullscreenButtons);

  const navLinks = [...document.querySelectorAll('[data-nav-link]')];
  const navSections = navLinks
    .map(link => document.getElementById(link.getAttribute('href').slice(1)))
    .filter(Boolean);

  const setActiveNav = id => {
    navLinks.forEach(link => {
      const active = link.getAttribute('href') === '#' + id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const updateActiveNav = () => {
    if (!navSections.length) return;
    const marker = Math.max(110, window.innerHeight * 0.28);
    let current = navSections[0];
    for (const section of navSections) {
      if (section.getBoundingClientRect().top <= marker) current = section;
      else break;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) {
      current = navSections[navSections.length - 1];
    }
    setActiveNav(current.id);
  };

  let navFrame = 0;
  const scheduleNavUpdate = () => {
    if (navFrame) return;
    navFrame = window.requestAnimationFrame(() => {
      navFrame = 0;
      updateActiveNav();
    });
  };

  window.addEventListener('scroll', scheduleNavUpdate, { passive: true });
  window.addEventListener('resize', scheduleNavUpdate);
  updateActiveNav();
})();
</script></body></html>`;
}
