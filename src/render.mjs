import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { reviewSolution } from './core.mjs';

const EMPHASIS_BLOCK_TYPES = new Set(['architecture', 'decisions']);

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
  return `<div class="source-refs"><span class="source-refs-label">证据：</span>${refs}</div>`;
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
  const sectionClass = EMPHASIS_BLOCK_TYPES.has(block.type) ? 'section section-emphasis' : 'section section-reading';

  return `<section id="${esc(block.id)}" class="${sectionClass}"><div class="section-head"><div><span class="eyebrow">${esc(block.type.replaceAll('_',' '))}</span><h2>${esc(block.title ?? block.type)}</h2></div>${renderImportance(block.importance)}</div><p class="why">为什么保留：${esc(block.reason)}</p>${refs}${artifactWarning}${body}</section>`;
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
  return `<div class="evidence-group ${className}"><h3>${esc(title)}</h3>${items.map(x => `<div class="evidence-item" title="${esc(`原始 ID：${x.id}`)}"><p>${esc(x.text)}</p>${x.source ? `<small>${esc(x.source)}</small>` : ''}</div>`).join('')}</div>`;
}

export function renderSolutionHtml(solution, options = {}) {
  const review = reviewSolution(solution);
  if (!review.ok) throw new Error(`Cannot render invalid solution: ${review.errors.map(e => e.message).join('; ')}`);
  const counts = review.counts;
  const meta = solution.meta ?? {};
  const nav = (solution.blocks ?? []).map(b => `<a data-nav-link href="#${esc(b.id)}">${esc(b.title ?? b.type)}</a>`).join('');
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
  const blocks = (solution.blocks ?? []).map(b => renderBlock(b, artifacts.get(b.id), evidenceIndex)).join('');
  const evidenceHtml = [
    evidenceGroup('已知事实', ev.facts, 'facts'),
    evidenceGroup('明确假设', ev.assumptions, 'assumptions'),
    evidenceGroup('待确认', ev.unknowns, 'unknowns')
  ].join('');
  const allWarnings = [...review.warnings.map(w => w.message), ...artifactWarnings];
  const warnings = allWarnings.length ? `<div class="review-note"><strong>交付前提醒</strong>${allWarnings.map(message => `<p>${esc(message)}</p>`).join('')}</div>` : '';

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(solution.title)}</title><style>
:root{font-family:Inter,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;color:#18202a;background:#f5f7fa;line-height:1.6}*{box-sizing:border-box}body{margin:0}.layout{display:grid;grid-template-columns:230px minmax(0,1fr);max-width:1480px;margin:auto}.side{position:sticky;top:0;height:100vh;padding:28px 18px;border-right:1px solid #e5e9ef;background:#fbfcfd}.brand{font-weight:800;font-size:18px;margin-bottom:18px}.nav-group{margin:0}.nav-group summary{cursor:pointer;list-style:none;color:#8993a1;font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:7px 10px;margin-bottom:4px;user-select:none}.nav-group summary::-webkit-details-marker{display:none}.nav-group summary::before{content:'▾';display:inline-block;margin-right:6px;transition:transform .15s ease}.nav-group:not([open]) summary::before{transform:rotate(-90deg)}.side nav{display:flex;flex-direction:column;gap:3px}.side a{position:relative;color:#65707e;text-decoration:none;padding:8px 10px 8px 12px;border-radius:7px;font-size:13px;transition:background .15s ease,color .15s ease}.side a:hover{background:#f1f4f7;color:#283442}.side a.is-active{background:#eef3f8;color:#1f3852;font-weight:600;box-shadow:inset 3px 0 0 #86a7c8}.main{padding:34px 48px 80px;min-width:0}.hero{background:white;border:1px solid #e3e8ef;border-radius:16px;padding:28px;box-shadow:0 8px 24px rgba(24,32,42,.04)}.hero h1{font-size:32px;line-height:1.2;margin:6px 0 10px}.summary{font-size:17px;color:#4b5665;max-width:920px}.meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.pill,.importance,.tag{display:inline-flex;align-items:center;border:1px solid #dfe5ec;border-radius:999px;padding:4px 9px;font-size:12px;background:#f8fafc}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:20px}.stat{background:#f8fafc;border-radius:12px;padding:12px}.stat b{display:block;font-size:18px}.stat span{font-size:12px;color:#687382}.section{border-radius:12px;padding:24px;margin-top:18px;scroll-margin-top:24px}.section-reading{background:rgba(255,255,255,.76);border:1px solid #edf1f5}.section-emphasis{background:#fff;border:1px solid #dfe6ee;box-shadow:0 5px 18px rgba(24,32,42,.035)}.section-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.section h2{font-size:22px;margin:2px 0 4px}.eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7b8795}.why{margin:4px 0 10px;padding:9px 12px;background:#f7f9fb;border-left:3px solid #cfd7e1;color:#5f6977;font-size:13px}.source-refs{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:0 0 18px;color:#74808f;font-size:12px}.source-refs-label{color:#7d8794}.source-ref{display:inline-flex;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 8px;border-radius:999px;background:#f1f4f7;color:#536171;cursor:help}.source-ref-sep{color:#b4bcc6}.artifact-warning{margin:0 0 14px;padding:9px 12px;background:#fff8e8;border:1px solid #eadfbc;border-radius:8px;color:#705b24;font-size:13px}.importance-high{display:inline-grid;place-items:center;width:20px;height:20px;opacity:.72}.importance-dot{display:block;width:7px;height:7px;border-radius:50%;background:#75a98a;box-shadow:0 0 0 3px rgba(117,169,138,.10)}.importance.medium{background:#fff8e8}.importance.low{background:#f7f7f7}.table-wrap{overflow:auto;border:1px solid #e4e9ef;border-radius:10px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:11px 12px;border-bottom:1px solid #e9edf2;vertical-align:top}th{background:#f7f9fb;color:#4c5664}tr:last-child td{border-bottom:0}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.mini-card{border:1px solid #e4e9ef;border-radius:12px;padding:14px;background:#fff}.mini-card h3{margin:6px 0 4px;font-size:16px}.mini-card p{margin:0;color:#596474}.diagram-fallback{border:1px dashed #cfd7e1;border-radius:12px;padding:16px;background:#fbfcfd}.diagram-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}.node{padding:14px;border:1px solid #dce3ea;border-radius:12px;background:#fff}.node span,.node small{display:block;color:#74808f;font-size:11px}.node strong{display:block;margin:3px 0}.edge-list{display:flex;flex-direction:column;gap:7px;margin-top:14px}.edge-list div{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px}.edge-list span{color:#687382}.sequence-list{display:flex;flex-direction:column;gap:8px}.sequence-step{display:grid;grid-template-columns:32px minmax(90px,auto) 18px minmax(90px,auto) 1fr;gap:8px;align-items:center;border:1px solid #e3e8ef;border-radius:10px;padding:10px 12px}.sequence-step small{grid-column:5;color:#74808f}.step-no{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#eef2f6;font-size:12px}.diagram-source pre,pre{white-space:pre-wrap;word-break:break-word;background:#111820;color:#e6edf3;border-radius:10px;padding:14px;overflow:auto}.embedded-diagram{background:white;border:1px solid #e3e8ef;border-radius:12px;overflow:hidden}.diagram-frame-actions{display:flex;justify-content:flex-end;align-items:center;min-height:44px;padding:7px 9px;border-bottom:1px solid #e8edf2;background:#fbfcfd}.diagram-fullscreen{appearance:none;border:1px solid #d8e0e8;border-radius:8px;background:white;color:#344050;padding:6px 10px;font:inherit;font-size:12px;line-height:1.4;cursor:pointer}.diagram-fullscreen:hover{background:#f3f6f9;border-color:#c5d0dc}.diagram-fullscreen:focus-visible{outline:2px solid #7ba6d8;outline-offset:2px}.embedded-diagram iframe{display:block;width:100%;height:650px;border:0;background:white}.embedded-diagram:fullscreen{width:100vw;height:100vh;display:flex;flex-direction:column;border:0;border-radius:0;background:white}.embedded-diagram:fullscreen .diagram-frame-actions{flex:0 0 auto}.embedded-diagram:fullscreen iframe{flex:1 1 auto;height:auto;min-height:0}.embedded-diagram:-webkit-full-screen{width:100vw;height:100vh;display:flex;flex-direction:column;border:0;border-radius:0;background:white}.embedded-diagram:-webkit-full-screen .diagram-frame-actions{flex:0 0 auto}.embedded-diagram:-webkit-full-screen iframe{flex:1 1 auto;height:auto;min-height:0}.evidence{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}.evidence-group{background:white;border:1px solid #e7ebf0;border-radius:12px;padding:16px}.evidence-group h3{margin:0 0 10px;font-size:15px}.evidence-item{padding:8px 0;border-bottom:1px solid #f0f2f5;cursor:help}.evidence-item:last-child{border-bottom:0}.evidence-item p{font-size:13px;margin:0}.evidence-item small{display:block;color:#7a8592;margin-top:2px}.review-note{margin-top:18px;padding:14px 16px;border:1px solid #eadfbc;background:#fffaf0;border-radius:12px}.review-note p{margin:4px 0;font-size:13px}.footer{margin-top:24px;color:#7a8592;font-size:12px;text-align:center}@media(max-width:900px){.layout{display:block}.side{position:relative;height:auto;border-right:0;border-bottom:1px solid #e5e9ef}.side nav{flex-direction:row;overflow:auto}.side a{white-space:nowrap}.main{padding:22px 16px 60px}.stats{grid-template-columns:repeat(2,1fr)}.evidence{grid-template-columns:1fr}.sequence-step{grid-template-columns:28px 1fr 18px 1fr}.sequence-step>span:nth-last-child(-n+2){grid-column:2/-1}.embedded-diagram iframe{height:520px}.embedded-diagram:fullscreen iframe,.embedded-diagram:-webkit-full-screen iframe{height:auto}}
</style></head><body><div class="layout"><aside class="side"><div class="brand">Human Read Tech HTML</div><details class="nav-group" open><summary>章节目录</summary><nav>${nav}<a data-nav-link href="#evidence">证据与待确认</a></nav></details></aside><main class="main"><header class="hero"><span class="eyebrow">technical solution</span><h1>${esc(solution.title)}</h1><div class="summary">${esc(solution.summary ?? '')}</div><div class="meta"><span class="pill">压力：${esc(solution.scoping.pressure)}</span><span class="pill">完整设计：${solution.scoping.fullDesignRequired ? '是' : '否'}</span>${meta.status ? `<span class="pill">状态：${esc(meta.status)}</span>` : ''}${meta.version ? `<span class="pill">版本：${esc(meta.version)}</span>` : ''}${meta.confidence ? `<span class="pill">置信度：${esc(meta.confidence)}</span>` : ''}</div><div class="stats"><div class="stat"><b>${counts.blocks}</b><span>内容块</span></div><div class="stat"><b>${counts.diagrams}</b><span>必要图</span></div><div class="stat"><b>${counts.tables}</b><span>结构表</span></div><div class="stat"><b>${allWarnings.length}</b><span>Review 提醒</span></div></div></header>${blocks}<section id="evidence" class="section section-reading"><div class="section-head"><div><span class="eyebrow">evidence</span><h2>证据、假设与待确认</h2></div></div><div class="evidence">${evidenceHtml || '<p>无额外证据项。</p>'}</div></section>${warnings}<div class="footer">Generated from solution.json · HTML is a derived artifact, not the source of truth.</div></main></div><script>
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
    if (!button) return;
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
