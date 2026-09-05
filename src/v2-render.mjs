import { renderSolutionHtml } from './render.mjs';
import { compileDocumentAst, compileV2Solution, reviewV2Solution } from './v2.mjs';

const SLOT_TITLES = {
  overview: '先看结论',
  design: '方案怎么工作',
  decisions: '为什么这样设计',
  delivery: '如何安全上线',
  details: '实现细节',
  appendix: '依据与附录'
};

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function replaceGroupTitles(html, ast) {
  let result = html;
  for (const group of ast.groups) {
    const previous = SLOT_TITLES[group.slot];
    if (!previous || previous === group.title) continue;
    result = result.split(`>${previous}<`).join(`>${esc(group.title)}<`);
  }
  return result;
}

function injectV2Meta(html, review) {
  const summary = `<div class="v2-compiler-note" style="margin-top:12px;color:#7a8592;font-size:12px">V2 layered compiler · ${review.document?.groups ?? 0} reading groups · ${review.document?.nodes ?? 0} presentation nodes · ${review.concernPacks?.length ?? 0} concern packs</div>`;
  return html.replace('</header>', `${summary}</header>`);
}

export function renderV2SolutionHtml(solution, options = {}) {
  const review = reviewV2Solution(solution);
  if (!review.ok) throw new Error(`Cannot render invalid V2 solution: ${review.errors.map(e => e.message).join('; ')}`);
  const ast = compileDocumentAst(solution);
  const compiled = compileV2Solution(solution);
  let html = renderSolutionHtml(compiled, options);
  html = replaceGroupTitles(html, ast);
  html = injectV2Meta(html, review);
  return html;
}
