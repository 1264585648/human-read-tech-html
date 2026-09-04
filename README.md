# Human Read Tech HTML

把需求、现状、约束和代码证据整理成**最小充分、可核实、可视化，而且真正适合人阅读的单页 HTML 技术方案**。

它不是固定技术方案模板。核心流程先判断“这个需求值得设计到什么深度”，再决定需要哪些语义内容，随后通过 Narrative Planner 把这些内容重组成适合人阅读的顺序，最后才决定用文字、表格还是图来表达。

## 当前核心目标

这个 Skill 同时解决两个不同的问题：

1. **Content Budget**：什么值得写，什么应该删；
2. **Reading Budget**：这些信息应该什么时候让读者看到。

复杂度可以增加方案深度，但不能同比增加第一遍阅读负担。

## Human Read 设计原则

> Do not maximize completeness. Maximize decision usefulness.

> Complexity may increase depth, not first-read burden.

当前正式引入的原则：

- **BLUF / 倒金字塔**：先给方案结论，再给背景和推导；
- **Progressive Disclosure**：支持 30 秒扫读、3 分钟理解、深入实施三层阅读；
- **Minto Pyramid 的结论优先**：Conclusion → Reasons → Evidence；
- **Information Scent**：一级目录说明“为什么要读”，而不是暴露内部技术分类；
- **Chunking**：多个语义 Block 组合成少量 Reading Groups；
- **Signal-to-noise**：减少摘要、正文、卡片和图之间的重复；
- **C4 的缩放思想**：只借层级下钻，不要求完整 C4 模板；
- **轻量 MADR**：只有真实技术取舍才生成 Decision。

详见 `references/reading-rules.md`。

## 三层阅读

### 30 秒：Scan

首屏 `brief` 回答：

- 最终准备怎么改；
- 核心变化；
- 影响范围；
- 最大风险/约束；
- 怎么上线或验证（如果重要）。

### 3 分钟：Understand

语义 Block 不再直接变成一级章节，而是组合到少量 Reading Groups：

- `overview` → 先看结论
- `design` → 方案怎么工作
- `decisions` → 为什么这样设计
- `delivery` → 如何安全上线

### 深入：Implement

实现和查证内容按需展开：

- `details` → 实现细节
- `appendix` → 依据与附录

Evidence / Assumption / Unknown 默认进入附录，不占用主阅读线。

## Block ≠ Chapter

Block 是机器和 Agent 使用的语义原子，不是人的目录项。

例如内部可以同时存在：

```text
architecture
flow
interfaces
data
non_functional
rollout
verification
risks
```

最终阅读目录可能只有：

```text
先看结论
方案怎么工作
如何安全上线
实现细节
依据与附录
```

这使复杂方案可以保留必要深度，同时避免 10+ 个一级章节。

## Reading metadata

新生成的 medium/high 方案建议显式给 Block 标注：

```json
{
  "reading": {
    "role": "detail",
    "group": "details"
  }
}
```

Role：

- `core`：理解方案必须看；
- `detail`：实现/深度评审时看；
- `reference`：查证时看。

`importance` 和 `reading.role` 不等价。一个 `importance=high` 的接口契约也可以是 `reading.role=detail`。

如果旧 `solution.json` 没有 reading metadata，Renderer 会使用确定性的默认 Narrative Planner 进行兼容编排；Review 会提醒 medium/high 方案最好补显式 metadata。

## BLUF brief

新 medium/high 方案建议提供：

```json
{
  "brief": {
    "bottomLine": "一句话说明最终方案",
    "keyChanges": ["变化 1", "变化 2"],
    "impact": "最重要的影响或不变边界",
    "keyRisks": ["关键风险"],
    "delivery": "灰度 / 验证 / 回滚结论"
  }
}
```

Brief 是正文的导航摘要，不应再复制完整背景或详细表格。

## V1.1 可靠性收口

在 V1 的“防过度设计”基础上已经补齐：

- 六个 Scoping 压力维度必须完整；
- Evidence 使用稳定 `id`，Block 可通过 `sourceRefs` 追溯事实/假设/待确认；
- Validator 补齐 Block ID、`content`、Evidence 引用和 Archify 关键引用检查；
- Review 增加高风险验证、上线回滚、调用链和数据变化检查；
- Diagram manifest 记录 `sourceHash`，Render 拒绝 hash 不一致的旧图；
- 嵌入图使用 sandboxed iframe，并支持父页面全屏查看；
- Golden + negative regression tests。

## 当前能力

- Scoper：六个设计压力维度 + Anti-overdesign Gate
- Content Budget：限制图、表、Block 的上限，不把上限当配额
- Narrative Planner：BLUF、Reading Role、Reading Group、渐进披露
- Reading Budget：限制一级阅读组、首屏信息点和 Core Blocks
- 动态 Block：不强制固定章节
- Representation Router：文字 / 表格 / Cards / Diagram 的确定性选择规则
- Archify Adapter Contract：Architecture / Sequence / Workflow / Data Flow / Lifecycle 主图引擎
- Mermaid fallback：ER / Gantt 等补位
- `solution.json` Schema：结构化内容作为 Source of Truth
- Review Engine：完整性、一致性、证据、过度设计和 Readability 检查
- Conservative Simplifier：只自动删除可确定的低价值内容
- 零依赖 Node CLI
- 自包含 HTML Renderer + Scroll Spy + Progressive Disclosure + Diagram Fullscreen
- 3 个 Golden Cases + CI 回归测试

## 架构

```text
Input
  ↓
Requirement Parser
  ↓
Scoper ── anti-overdesign gate / content budget
  ↓
Research Gate（按需）
  ↓
Solution Engine
  ↓
Semantic Blocks
  ↓
Narrative Planner
  ├─ BLUF brief
  ├─ Reading Role
  ├─ Reading Group
  ├─ Chunking
  └─ Progressive Disclosure
  ↓
Representation Router
  ├─→ Archify / Mermaid
  └─→ Native text / table / cards
  ↓
Review / Simplifier
  ↓
HTML Renderer
  ↓
solution.html
```

`solution.json` 仍然是唯一内容事实源。Narrative Planner 不创造新的技术事实，只负责暴露顺序和阅读深度。

## Reading Budget

| Pressure | 一级 Reading Groups | 首屏信息点 | Core Blocks |
|---|---:|---:|---:|
| low | <= 3 | <= 5 | <= 5 |
| medium | <= 5 | <= 7 | <= 7 |
| high | <= 6 | <= 8 | <= 8 |

Reading Budget 和 Content Budget 是两个不同约束：

- Content Budget 防止方案本身过度设计；
- Reading Budget 防止必要的复杂信息一次性压给读者。

## CLI

要求 Node.js 20+，无第三方 npm 运行依赖。

```bash
# 校验结构、scoping、Evidence、reading metadata 和图表路由
node bin/hrth.mjs validate examples/01-simple-field/solution.json

# 完整 Review（含 readability）
node bin/hrth.mjs review examples/03-kafka-async/solution.json

# 保守精简，永远写新文件，不原地修改
node bin/hrth.mjs simplify solution.json solution.simplified.json

# 导出 Archify / Mermaid typed source
node bin/hrth.mjs diagrams examples/03-kafka-async/solution.json .hrth/diagrams

# 生成自包含 HTML
node bin/hrth.mjs render examples/03-kafka-async/solution.json solution.html

# 嵌入正式 Diagram artifact
node bin/hrth.mjs render solution.json solution.html --diagram-dir .hrth/diagrams
```

## Evidence 追溯

每条 Fact / Assumption / Unknown 都有稳定 ID：

```json
{
  "id": "fact-current-sync-call",
  "text": "当前后处理位于同步请求链路。",
  "source": "repository evidence"
}
```

Block 在结论依赖该证据时使用：

```json
{
  "sourceRefs": ["fact-current-sync-call"]
}
```

HTML 主阅读线显示人类可读的 Evidence 文本，原始 ID 作为 hover metadata；完整 Evidence 进入附录。

## Archify 集成

`architecture / sequence / workflow / dataflow / lifecycle` 的 `representation.spec` 直接保存 Archify Typed JSON Source。

```bash
node bin/hrth.mjs diagrams solution.json .hrth/diagrams
```

典型目录：

```text
.hrth/diagrams/
├── architecture.architecture.json
├── flow.sequence.json
└── manifest.json
```

`manifest.json` 为每张图记录 `sourceHash`。source 变化时清理旧 HTML / receipt；source 未变化时保留已编译 artifact，支持增量使用。

由 Agent 调用 Archify `validate` / `deliver` 后，将结果保存成 `<block-id>.html`。Renderer 会校验 source hash，旧图不会静默混入最终方案。

如果 Archify 不可用，Architecture / Sequence 提供诚实的语义降级视图，不会伪装成已经过 Archify 校验。

## Golden Cases

| Case | Pressure | Semantic Blocks | Diagrams | 一级阅读组 | 设计意图 |
|---|---:|---:|---:|---:|---|
| 接口增加字段 | low | 5 | 0 | 3 | 小需求保持直接 |
| Redis 查询缓存 | medium | 8 | 0 | 4 | 中等复杂度也不强制画图，不暴露 8 个一级章节 |
| Kafka 异步后处理 | high | 11 | 2 | 5 | 保留完整工程深度，但第一遍只看到 5 个阅读组 |

`tests/validation.mjs` 还覆盖 Schema 错误、Evidence 引用、Reading metadata、Reading Budget、Archify 引用、stale diagram、full screen 和 Narrative rendering。

```bash
npm test
```

## 项目结构

```text
human-read-tech-html/
├── SKILL.md
├── README.md
├── package.json
├── bin/hrth.mjs
├── src/
│   ├── core.mjs
│   └── render.mjs
├── schemas/solution.schema.json
├── references/
│   ├── scoping-rules.md
│   ├── reading-rules.md
│   ├── representation-rules.md
│   └── review-rules.md
├── adapters/
│   ├── archify.md
│   └── mermaid.md
├── docs/
│   └── v1-design.md
├── examples/
│   ├── 01-simple-field/
│   ├── 02-redis-cache/
│   └── 03-kafka-async/
└── tests/
    ├── golden.mjs
    └── validation.mjs
```

## 明确不做

- 固定 10 章 / 12 章技术方案模板
- 完整 C4 层级强制输出
- MECE 强制拆分
- 主题市场或复杂组件系统
- 自动维护完整架构知识库
- 自动写入 ADR 历史库
- AI 二次 Review 服务或 NLP 相似度系统
- 为“显得完整”而制造技术选型对比
- PDF / PPT / Word 多格式输出

详见 [`docs/v1-design.md`](docs/v1-design.md)。
