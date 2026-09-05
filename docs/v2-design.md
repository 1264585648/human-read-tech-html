# V2 分层技术方案编译器

V2 的目标不是增加更多章节，而是把“技术设计”和“阅读设计”真正拆开。

## 1. 核心变化

V1 的 `solution.json` 同时包含：

- 技术语义；
- reading role/group；
- representation kind/engine/spec。

这会让 Source of Truth 同时承担 Model 与 View，两者修改容易互相影响。

V2 改为：

```text
Evidence
  ↓
Problem / Scoping
  ↓
Concern Layer
  ↓
Solution Model
  ↓
View Plan
  ↓
Document AST
  ↓
Representation / Diagram adapters
  ↓
HTML Renderer
```

## 2. 六层能力结构

### Understand

负责需求、现状、约束、Evidence、Assumption、Unknown 与 Scoping。

### Concern

根据变更识别必须回答的工程问题。Concern 是问题集，不是章节模板。

### Design

形成稳定的 Solution Model：系统边界、变化、流程、契约、数据、决策、可靠性、上线和验证等技术语义。

### Narrative

决定读者先看什么、后看什么。V2 使用：

- `view.brief`：30 秒 Scan；
- `understand`：3–5 分钟主阅读；
- `implement`：实施查阅；
- `reference`：依据与查证。

### Presentation

一个语义 Block 可以有多个 Presentation Node，例如：

```text
Architecture semantic block
  ├─ Architecture diagram
  └─ Key boundary paragraph
```

图负责关系，文字负责理由、边界、异常或后果，不再被迫二选一。

### Quality

Review 同时检查：

- 结构有效性；
- Evidence 引用；
- Concern 问题覆盖；
- Narrative 阅读预算；
- 现有 V1 completeness / overdesign / diagram rules。

## 3. V2 数据结构

```text
solution.json
├─ schemaVersion: 0.2
├─ title / meta / scoping
├─ evidence
├─ concerns[]
├─ model
│   └─ blocks[]
└─ view
    ├─ brief
    └─ groups[]
        └─ items[]
            └─ presentations[]
```

### 3.1 Model Block

V2 Model Block 只描述技术语义：

```json
{
  "id": "architecture",
  "type": "architecture",
  "title": "目标边界",
  "importance": "high",
  "reason": "同步边界变成消息边界。",
  "content": {
    "body": "订单主事务和后处理解耦。"
  },
  "sourceRefs": ["assumption-at-least-once"]
}
```

禁止在 Model Block 内写 `reading` 或 `representation`。

### 3.2 View Group

```json
{
  "id": "working-model",
  "title": "新方案怎么工作",
  "layer": "understand",
  "slot": "design",
  "items": []
}
```

`title` 是读者看到的问题式标题。

`slot` 用于把 V2 View 编译到当前稳定 Renderer 的六个 Narrative Slot：

- overview
- design
- decisions
- delivery
- details
- appendix

它是兼容桥，不是新的固定章节模板。

### 3.3 Multiple Presentations

```json
{
  "blockRef": "architecture",
  "presentations": [
    {
      "id": "architecture-diagram",
      "kind": "architecture",
      "engine": "archify",
      "reason": "组件和消息边界用图更清楚。",
      "spec": {}
    },
    {
      "id": "architecture-boundary",
      "title": "最重要的边界",
      "kind": "text",
      "engine": "native",
      "reason": "补充图无法表达的故障隔离结论。",
      "content": {
        "body": "订单成功不再依赖通知服务实时可用。"
      }
    }
  ]
}
```

Document AST 会把它编译成两个独立 Presentation Nodes，但两者仍引用同一个 semantic block。

## 4. Document AST

`compileDocumentAst()` 是 Model 与 Renderer 之间的稳定边界。

AST Node 记录：

- semantic `blockRef`；
- reading `layer` / narrative `slot`；
- presentation kind / engine；
- content / diagram spec；
- Evidence refs。

Renderer 不再需要从 Block type 猜测全部阅读意图。

## 5. V1 兼容

V2 当前通过 `compileV2Solution()` 编译为稳定的 V1 runtime shape，再复用现有：

- Validator；
- Review Engine；
- Diagram exporter；
- Renderer；
- stale diagram protection。

这样可以先完成架构分层，而不一次性重写 26K+ 的 Renderer。

CLI 会自动识别 `schemaVersion: 0.1` 与 `0.2`：

```bash
node bin/hrth.mjs validate solution.json
node bin/hrth.mjs review solution.json
node bin/hrth.mjs render solution.json solution.html
node bin/hrth.mjs diagrams solution.json .hrth/diagrams
```

额外命令：

```bash
# 查看内置 Concern Packs
node bin/hrth.mjs concerns

# 查看 V2 编译后的兼容 runtime 结构
node bin/hrth.mjs compile solution.v2.json compiled.v1.json
```

## 6. 当前不做的事情

V2 第一阶段刻意不做：

- 自动修改 V2 Model/View 的 simplifier；
- 无限扩展 Block type；
- 让每个插件定义自己的 Narrative vocabulary；
- 用 AI/NLP 自动判断所有 Concern 是否回答正确；
- 重写整个 V1 HTML Renderer。

原因是这些能力要建立在 Model/View/AST 分层稳定之后。

## 7. 下一阶段

V2.1 优先项：

1. 给 Decision / Risk / Rollout / Interface 等高价值语义增加 typed content contract；
2. 增加更多 Concern Packs（security、transaction、scheduled-job、file-processing 等）；
3. 将 Evidence `source` 从字符串升级为 typed provenance；
4. 逐步让 HTML Renderer 直接消费 Document AST，最终移除 V2 → V1 的兼容编译桥；
5. 增加真正的阅读质量 Golden Corpus，而不只验证元素数量。
