# V1 技术设计

## 1. 产品定义

Human Read Tech HTML 不是“固定模板填充器”，而是一个**技术方案裁剪、设计、可视化与审查 Skill**。

输入可以是需求描述、PRD、接口说明、代码仓库、现状架构或约束；输出是一份根据真实复杂度动态组成的技术方案。最终 HTML 的目标是让研发、测试、产品或架构评审者能够快速回答：

- 为什么改？
- 改什么、不改什么？
- 核心链路怎么变？
- 为什么采用这个技术决策？
- 有什么风险、怎么验证、怎么上线和回滚？

核心准则：**Do not maximize completeness. Maximize decision usefulness.**

---

## 2. V1 架构

```text
Input
  │
  ▼
Requirement Parser
  │  facts / assumptions / unknowns / constraints
  ▼
Scoper
  │  decide whether a full design is justified
  │  select content blocks and representation hints
  ▼
Research Gate ───────────────┐
  │ only for material unknowns│
  ▼                           │
Solution Engine               │
  │                           │
  ▼                           │
solution.json  ◄──────────────┘
  │
  ├── Diagram Router ──→ Archify Adapter
  │                  └─→ Mermaid Adapter
  │
  ▼
HTML Renderer
  │
  ▼
Review Engine
  │ completeness / consistency / overdesign / evidence
  ▼
Simplifier
  │ delete low-value blocks
  ▼
solution.html
```

`solution.json` 是唯一内容事实源。HTML、图表、Markdown 摘要都从它派生。

---

## 3. Scoper：先决定“值得写多少”

Scoper 不直接给需求贴“轻量 / 标准 / 大型模板”，而是先判断**设计压力（design pressure）**。

### 3.1 六个压力维度

| 维度 | 低 | 中 | 高 |
|---|---|---|---|
| 改动范围 | 单模块/单接口 | 多模块 | 跨系统/跨团队 |
| 数据变化 | 无 | 字段/表/缓存变化 | 迁移/一致性/多存储 |
| 调用链 | 本地逻辑 | 2–3 个参与者 | 多服务/MQ/异步链路 |
| 业务风险 | 易回滚 | 有用户影响 | 核心链路/资金/合规 |
| 性能容量 | 无明显变化 | 有并发/延迟目标 | 高峰、容量、弹性要求 |
| 技术不确定性 | 已有成熟模式 | 部分新技术 | 新中间件/新架构/关键未知 |

这些维度用于判断深度，但**不直接映射固定章节数量**。

### 3.2 Anti-overdesign Gate

满足以下情况时，默认不跑完整技术方案流程：

- 改动局限于单一组件，行为和数据边界清晰；
- 不改变跨系统拓扑；
- 不引入新的数据一致性、性能、可靠性或安全问题；
- 已有明确团队模式或历史决策直接约束答案；
- 用一段方案说明 + 一张变更表即可无歧义实施。

此时输出可以只有：背景/目标、改动点、兼容性、测试与上线。

### 3.3 Content Budget

预算是**上限，不是配额**。

| 设计压力 | 图 | 表 | 内容块 | 目标 |
|---|---:|---:|---:|---|
| 低 | 0–1 | 0–2 | 3–6 | 让开发无歧义实施 |
| 中 | 1–3 | 1–4 | 5–9 | 支持正式技术评审 |
| 高 | 按需 | 按需 | 按需但需裁剪 | 支持架构级评审 |

任何图或章节都不能因为“预算还有余量”而被生成。

---

## 4. 内容不是章节，而是 Block

V1 使用动态 Block，而不是固定 10 章。

候选 Block：

- `summary`：一句话方案与关键收益
- `context`：背景、现状、问题
- `goals`：目标 / Non-goals / 约束
- `change_set`：具体改造点
- `architecture`：系统/服务/组件关系
- `flow`：核心流程、时序或状态变化
- `interfaces`：API / 消息契约 / 外部依赖
- `data`：表结构、缓存、数据流、一致性
- `decisions`：存在真实取舍时的技术决策
- `non_functional`：性能、安全、稳定性、可观测性
- `rollout`：灰度、迁移、回滚、兼容性
- `verification`：测试与验收
- `risks`：风险、假设、待确认项

### Block 进入条件

每个候选 Block 在加入方案前必须回答：

1. 删除它是否会让实现变得有歧义？
2. 删除它是否会掩盖重要 trade-off 或风险？
3. 删除它是否会影响上线、回滚或验收？
4. 删除它是否会让未来维护者无法解释关键设计？

四个问题都为“否”时，Block 默认删除。

---

## 5. 表达形式 Router

先确定“需要表达什么”，再确定“用什么表达”。

| 信息类型 | 默认表达 |
|---|---|
| 一个简单事实/结论 | 文字 |
| 多项结构化字段、影响项、风险项 | 表格 |
| Before / After 的少量变化 | 变更表或并排卡片 |
| 多服务/组件之间关系 | Architecture |
| 一次跨参与者请求调用 | Sequence |
| 有步骤、分支、审批、异常路径的过程 | Workflow |
| 数据从来源到转换、存储、消费者 | Data Flow |
| 状态、重试、等待、终态 | Lifecycle |
| 实体/表之间的数据关系 | ER（Mermaid fallback） |
| 时间阶段和交付节奏 | Timeline/Gantt，仅真正需要时 |
| 多个可行技术方案的权衡 | Decision table + ADR 摘要 |

### 5.1 Diagram Gate

只有满足下面任一条件才画图：

- 文字描述会隐藏重要关系；
- 调用顺序影响正确性；
- 分支/异常路径影响实现；
- 边界、信任域、数据移动需要被看见；
- 多个参与者之间的依赖难以通过表格快速理解。

若一张小表或 3–5 句话能无歧义表达，则不画图。

### 5.2 图的密度约束

- 一张图只讲一个主要故事；
- 首选 5–10 个核心节点，超过 12 个主要节点必须解释原因；
- 次要说明放卡片/表格，不继续加线；
- 不为了展示基础设施“完整性”而画无变化组件；
- 每张图必须有 `reason`，说明它为什么比文字更合适。

---

## 6. Diagram Router

### 6.1 Archify：默认主引擎

优先处理：

- Architecture
- Workflow
- Sequence
- Data Flow
- Lifecycle

集成原则：

- 我们负责决定**是否需要图、图的语义和节点范围**；
- Archify 负责 Typed IR、布局、校验和 HTML/SVG 产物；
- 不把 Archify 的 Renderer/Validator 逻辑复制进本项目；
- 图的源数据保留在 `solution.json` 的 diagram spec 中。

### 6.2 Mermaid：补位引擎

仅在 Archify 不适配或简单文本 DSL 更合适时使用，例如：

- ER
- Class
- Gantt
- Git graph
- 非核心简单图

同一语义类型不能同时随机选择多个引擎；Router 必须是确定性的。

---

## 7. Research Gate：只核实真正影响方案的未知

研究不是默认流程。只有以下情况进入 Research Gate：

- 使用项目当前未采用的新框架/中间件/协议/云服务；
- 版本、API、配额、兼容性、限制可能影响设计；
- 对 failure mode、事务语义、数据一致性等关键事实没有可靠依据；
- 用户明确要求基于代码或官方资料核实。

研究结果只进入 `evidence` / `assumptions` / `decision rationale`，不把长篇调研报告塞进最终方案。

---

## 8. 技术决策规则

只有存在**两个及以上真实可行、且在关键维度上存在差异**的选择时，才创建 Decision Block。

Decision 采用轻量 MADR 语义：

```text
Context / Problem
→ Considered Options
→ Decision
→ Rationale
→ Consequences
```

规则：

- 先构造“最简单可生产”的方案；
- Alternative 必须在负载、正确性、故障隔离、成本、复杂度等关键轴上真正不同；
- 被规则或约束直接淘汰的方案只保留一句 rejection reason；
- 候选最多 3 个，3 是上限而不是目标；
- 不制造 Redis vs MySQL vs MongoDB 这类没有实际选择背景的仪式化对比。

---

## 9. Review Engine

最终输出前执行四类检查。

### 9.1 Completeness

只检查“本方案声明需要的内容”是否完整，不要求固定章节：

- 目标和范围是否明确；
- 核心改造是否可实施；
- 关键边界、数据和调用关系是否明确；
- 风险、验证、上线和回滚是否覆盖到需要的程度。

### 9.2 Consistency

- 图和文字是否描述同一组组件与关系；
- 接口/字段/状态名是否一致；
- Before / After 是否自洽；
- 方案结论是否与约束、证据、决策一致。

### 9.3 Evidence

- `fact` 是否有用户输入、仓库代码或外部证据支持；
- `assumption` 是否显式标记；
- `unknown` 是否被伪装成确定结论；
- 新技术关键事实是否经过 Research Gate。

### 9.4 Overdesign

逐块检查：

- 没有数据变化却出现数据设计？删除。
- 没有部署变化却出现部署图？删除。
- 只有一个合理路径却出现 ADR 对比？删除。
- 文字能说清却画图？删除图。
- 图中节点不影响本次设计？从图中删除。
- 同一事实被摘要、卡片、正文和图重复表达？保留最有效的一处。

---

## 10. HTML 信息架构

HTML 不固定章节，但固定阅读层级：

```text
Header
  title / status / scope / confidence

Executive Summary
  one sentence / goals / key changes / key risks

Dynamic Content Blocks
  根据 Scoper 选择和排序

Evidence & Unknowns
  assumptions / unknowns / references（按需）

Rollout & Verification
  如果本次变更需要
```

页面规则：

- 左侧目录只展示实际存在的 Block；
- 首屏回答“为什么、改什么、风险多大”；
- 图用于关系，表用于结构，文字用于解释；
- 不使用装饰性 KPI、虚构数字、无意义图表；
- 同一信息不重复三次。

---

## 11. 三个裁剪示例

### 示例 A：接口增加一个字段

需要：`context + change_set + interfaces + verification + rollout`

不需要：架构图、ER、ADR、容量规划。

### 示例 B：查询接口增加 Redis 缓存

需要：`context + goals + change_set + flow + data + risks + verification`

图：只有当缓存命中/回源/失效链路存在多参与者或异常路径时才生成 Sequence。

重点问题：Key、TTL、失效、穿透、允许的数据陈旧窗口、降级行为。

### 示例 C：同步订单链路改为 Kafka 异步处理

需要：`context + goals + architecture + flow + interfaces + data + decisions + non_functional + rollout + verification + risks`

图：Architecture + Sequence/Workflow 按信息价值选择 1–2 张，不自动全画。

重点问题：消息契约、幂等、重试、顺序、DLQ/补偿、可观测性、灰度和回滚。

---

## 12. V1 实施顺序

1. 固定 `solution.schema.json` 和 Block 模型；
2. 实现 Scoper / Representation Router 的规则；
3. 做最小 HTML Renderer；
4. 接 Archify Adapter；
5. 接 Mermaid fallback；
6. 实现 Review + Simplifier；
7. 用 3 个不同复杂度案例做回归测试。

V1 成功标准不是“能生成很完整的技术方案”，而是：**简单需求足够短，复杂需求足够清楚，所有内容都有存在理由。**
