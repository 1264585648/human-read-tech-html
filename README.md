# Human Read Tech HTML

把需求、现状、约束和代码证据整理成**最小充分、可核实、适合人阅读的单页 HTML 技术方案**。

V2 不再把它视为“技术方案模板 + HTML Renderer”，而是一个分层的 **Technical Solution Compiler**：先理解问题，再识别工程 Concern，形成技术 Solution Model，然后单独规划阅读叙事与表现形式，最后编译成 HTML。

> Do not maximize completeness. Maximize decision usefulness.

> Technical depth may grow. First-read burden should not grow at the same rate.

## 为什么要做 V2

V1 已经解决了两个重要问题：

- **Content Budget**：什么值得写，什么应该删；
- **Reading Budget**：这些信息应该什么时候让读者看到。

但 V1 的 Block 同时携带技术内容、reading metadata 和 representation spec，Model 与 View 仍然耦合。

V2 将这三件事拆开：

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

## 六层能力结构

### 1. Understand

识别：

- 当前状态；
- 真正要解决的问题；
- Goals / Non-goals；
- 约束；
- Facts / Assumptions / Unknowns；
- 六个设计压力维度。

### 2. Concern

Concern 不是章节，而是一组**必须回答的工程问题**。

内置首批 Concern Packs：

- `async-messaging`
- `cache`
- `data-migration`
- `external-api`

例如异步消息关注的不是“有没有 MQ 章节”，而是：投递语义、幂等、顺序、ACK、重试、DLQ、故障隔离、可观测性和容量是否已经回答。

### 3. Design

形成纯技术语义的 Solution Model：

```text
context / goals / change_set
architecture / flow
interfaces / data
decisions / non_functional
rollout / verification / risks
```

Block 是语义原子，不是目录章节。

V2 Model Block 内不允许写 `reading` 或 `representation`。

### 4. Narrative

单独决定人应该怎么读：

- `brief`：30 秒 Scan；
- `understand`：3–5 分钟理解主方案；
- `implement`：实施时查阅；
- `reference`：证据与依据。

主阅读线按照读者问题组织，而不是按照内部数据类型组织。

### 5. Presentation

View Plan 再决定一个语义用什么方式表达。

一个 Block 可以有多个 Presentation：

```text
Architecture semantic block
  ├─ Architecture diagram
  └─ Key boundary paragraph
```

这解决了 V1 “图和正文只能二选一”的限制。

### 6. Quality

Review 同时检查：

- Schema / 引用完整性；
- Evidence 追溯；
- Concern 问题覆盖；
- Content Budget；
- Reading Budget；
- Overdesign；
- Diagram freshness；
- 可读性。

## 三种阅读深度

### Scan — 30 秒

首屏只回答：

- 最终怎么改；
- 3–5 个关键变化；
- 影响边界；
- 最大风险；
- 怎么上线/验证。

### Understand — 3–5 分钟

典型读者问题：

```text
这次到底改变了什么
新方案怎么工作
为什么这样设计
有哪些关键边界
怎么安全上线并证明可恢复
```

### Implement — 按需

接口、字段、状态、表结构、配置、超时、重试、测试矩阵、灰度参数等实现内容可以很重，但默认不占第一遍阅读路径。

核心原则：

> 不是技术方案不能重，而是不能让所有重量同时暴露。

## V2 `solution.json`

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

Schema：`schemas/solution.v2.schema.json`

完整设计：`docs/v2-design.md`

Concern 规则：`references/concern-rules.md`

## CLI

Node.js 20+，核心运行时无第三方 npm 依赖。

V1 `0.1` 与 V2 `0.2` 都可以直接使用同一套命令：

```bash
node bin/hrth.mjs validate solution.json
node bin/hrth.mjs review solution.json
node bin/hrth.mjs render solution.json solution.html
node bin/hrth.mjs diagrams solution.json .hrth/diagrams
```

V2 额外提供：

```bash
# 查看可用 Concern Packs
node bin/hrth.mjs concerns

# 查看 V2 编译成的兼容 runtime 结构
node bin/hrth.mjs compile solution.v2.json compiled.v1.json
```

## Diagram

Archify 继续作为：

- Architecture
- Sequence
- Workflow
- Data Flow
- Lifecycle

的首选图引擎。

Mermaid 作为 ER / Gantt 等简单补位。

图的选择属于 View / Representation，不属于 Solution Model。图表源仍记录 hash；旧图不会静默混入新方案。

## Golden Cases

当前包含：

| Case | Schema | 目的 |
|---|---|---|
| `01-simple-field` | 0.1 | 小改动保持足够轻 |
| `02-redis-cache` | 0.1 | 中等复杂度不强制画图 |
| `03-kafka-async` | 0.1 | V1 高复杂度兼容锚点 |
| `04-kafka-v2` | 0.2 | Model/View/AST + Concern + 多 Presentation |

```bash
npm test
```

## 项目结构

```text
human-read-tech-html/
├── SKILL.md
├── README.md
├── bin/hrth.mjs
├── src/
│   ├── core.mjs
│   ├── render.mjs
│   ├── v2.mjs
│   └── v2-render.mjs
├── schemas/
│   ├── solution.schema.json
│   └── solution.v2.schema.json
├── concerns/
│   ├── async-messaging.json
│   ├── cache.json
│   ├── data-migration.json
│   └── external-api.json
├── references/
│   ├── scoping-rules.md
│   ├── concern-rules.md
│   ├── reading-rules.md
│   ├── representation-rules.md
│   └── review-rules.md
├── docs/
│   ├── v1-design.md
│   └── v2-design.md
├── examples/
│   ├── 01-simple-field/
│   ├── 02-redis-cache/
│   ├── 03-kafka-async/
│   └── 04-kafka-v2/
└── tests/
    ├── golden.mjs
    ├── validation.mjs
    └── v2.mjs
```

## V2 当前的兼容策略

V2 的 Document AST 会编译成稳定的 V1 runtime shape，再复用现有 Validator、Diagram exporter 和 HTML Renderer。

这是刻意的渐进式迁移：先把架构分层做正确，再逐步让 Renderer 直接消费 Document AST，而不是一次性重写所有已有能力。

## 下一阶段

优先方向：

1. Decision / Risk / Rollout / Interface typed semantic contracts；
2. Security / transaction / scheduled-job 等 Concern Packs；
3. typed Evidence provenance 与 freshness；
4. Renderer 直接消费 Document AST；
5. 阅读质量 Golden Corpus 与浏览器级视觉回归。

详见 `docs/v2-design.md`。
