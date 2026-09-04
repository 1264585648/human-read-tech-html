# Human Read Tech HTML

把需求、现状、约束和代码证据整理成**最小充分、可核实、可视化的单页 HTML 技术方案**。

它不是固定技术方案模板。核心流程是先判断“这个需求值得设计到什么深度”，再决定需要哪些内容，以及用文字、表格还是图来表达。

## V1.1 收口

在 V1 的“防过度设计”基础上补齐可靠性边界，不扩大产品范围：

- 六个 Scoping 压力维度必须完整；
- Evidence 使用稳定 `id`，Block 可通过 `sourceRefs` 追溯事实/假设/待确认；
- Validator 补齐 Block ID、`content`、Evidence 引用和 Archify 关键引用检查；
- Review 增加高风险验证、上线回滚、调用链和数据变化的确定性 completeness 提醒；
- Diagram manifest 记录 `sourceHash`，重新导出时清理旧 HTML，Render 拒绝 hash 不一致的旧图；
- 嵌入图使用 sandboxed iframe；
- 在 3 个 Golden Cases 外增加 negative regression tests。

## V1 已完成

- Scoper：六个设计压力维度 + Anti-overdesign Gate
- Content Budget：限制图、表、Block 的上限，不把上限当配额
- 动态 Block：不强制固定章节
- Representation Router：文字 / 表格 / Cards / Diagram 的确定性选择规则
- Archify Adapter Contract：Architecture / Sequence / Workflow / Data Flow / Lifecycle 主图引擎
- Mermaid fallback：ER / Gantt 等补位
- `solution.json` Schema：结构化内容作为 Source of Truth
- Review Engine：完整性、一致性、证据和过度设计检查
- Conservative Simplifier：只自动删除可确定的低价值内容
- 零依赖 Node CLI
- 自包含 HTML Renderer
- 3 个 Golden Cases + CI 回归测试

## 核心原则

> Do not maximize completeness. Maximize decision usefulness.

1. **先裁剪，再生成**：先判断是否需要完整设计。
2. **图表不是配额**：中等复杂度也可以 0 张图。
3. **每个 Block 必须有 `reason`**：解释为什么删除它会损害实现或评审。
4. **每种 Representation 必须有 `reason`**：解释为什么它比更简单的表达更好。
5. **事实 / 假设 / 待确认分离**：不能把未知包装成结论。
6. **HTML 不是事实源**：`solution.json` 才是。

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
solution.json
  ├─→ Review / Simplifier
  ├─→ Diagram Source Export ─→ Archify / Mermaid
  └─→ HTML Renderer
          ↓
      solution.html
```

## CLI

要求 Node.js 20+，V1 无第三方 npm 运行依赖。

```bash
# 校验结构、六维 scoping、Evidence 引用和图表路由
node bin/hrth.mjs validate examples/01-simple-field/solution.json

# 运行完整 Review
node bin/hrth.mjs review examples/03-kafka-async/solution.json

# 保守精简，永远写新文件，不原地修改
node bin/hrth.mjs simplify solution.json solution.simplified.json

# 导出 Archify / Mermaid typed source，并写 sourceHash manifest
node bin/hrth.mjs diagrams examples/03-kafka-async/solution.json .hrth/diagrams

# 生成自包含 HTML
node bin/hrth.mjs render examples/03-kafka-async/solution.json solution.html

# 如果 Archify 已把 <block-id>.html 编译到目录，构建时校验 hash 后嵌入正式图
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

Validator 会拒绝不存在的 Evidence 引用，最终 HTML 也会显示这些引用，方便评审追溯。

## Archify 集成

`architecture / sequence / workflow / dataflow / lifecycle` 的 `representation.spec` 直接保存 Archify Typed JSON Source。

运行：

```bash
node bin/hrth.mjs diagrams solution.json .hrth/diagrams
```

会得到类似：

```text
.hrth/diagrams/
├── architecture.architecture.json
├── flow.sequence.json
└── manifest.json
```

`manifest.json` 为每张图记录 `sourceHash`。重新导出 source 时，CLI 会先删除对应旧 HTML/receipt，避免旧图静默残留。

由 Agent 调用 Archify 对每个 JSON 执行 `validate` / `deliver`，并将结果保存成：

```text
architecture.html
flow.html
```

可选地在成功交付后写 `<block-id>.receipt.json`，记录同一 `sourceHash`、Archify 版本和 `validated: true`。

再通过 `--diagram-dir` 嵌入最终技术方案。Render 会重新计算当前 `representation.spec` hash；不一致时拒绝嵌入并使用语义降级视图。

如果 Archify 不可用，V1 对 Architecture / Sequence 提供**诚实的语义降级视图**，保证方案仍能阅读，但不会声称经过 Archify 的布局/质量校验。

## Golden Cases

| Case | Pressure | Blocks | Diagrams | Tables | 设计意图 |
|---|---:|---:|---:|---:|---|
| 接口增加字段 | low | 5 | 0 | 2 | 小需求绝不制造架构图 |
| Redis 查询缓存 | medium | 8 | 0 | 3 | 中等复杂度也不强制画图 |
| Kafka 异步后处理 | high | 11 | 2 | 6 | 只画拓扑变化和关键时序 |

除此之外，`tests/validation.mjs` 覆盖缺维度、缺 `content`、非法 ID、Evidence 引用错误、Archify 引用错误、高风险缺验证和 stale diagram 等反例。

运行全部回归：

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

## V1 明确不做

- PDF / PPT / Word 多格式输出
- 主题市场或复杂组件系统
- 自动维护完整架构知识库
- 自动写入 ADR 历史库
- 为简单需求生成 C4 全套层级
- 为“显得完整”而制造技术选型对比

详见 [`docs/v1-design.md`](docs/v1-design.md)。
