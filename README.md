# Human Read Tech HTML

一个面向研发评审的技术方案生成 Skill：把需求、现状、约束和代码证据整理成**最小充分、可核实、可视化的单页 HTML 技术方案**。

## 核心原则

1. **先裁剪，再生成**：先判断需求是否值得完整技术方案，再决定深度与表达形式。
2. **最小充分设计**：章节、图、表、文字都必须服务于实现、评审、上线或后续维护；删除不影响理解的内容。
3. **结构化内容是事实源**：`solution.json` 是 Source of Truth，HTML 只是派生产物。
4. **图按语义选择**：关系/拓扑优先架构图，跨参与者调用优先时序图，分支过程优先流程图，结构化比较优先表格，简单事实优先文字。
5. **不为了完整而完整**：没有数据变化就不生成数据设计，没有部署变化就不生成部署图，没有真实技术取舍就不生成 ADR。
6. **事实、假设、待确认分离**：不能核实的信息不得伪装成确定结论。

## V1 流程

```text
Requirement Parser
        ↓
      Scoper
        ↓
Research Gate（按需）
        ↓
Solution Engine
        ↓
 solution.json
        ↓
Diagram Router ──→ Archify / Mermaid（按需）
        ↓
HTML Renderer
        ↓
Review / Simplify
        ↓
solution.html
```

## V1 只做什么

- 判断方案复杂度与必要性
- 动态选择技术方案内容块
- 生成结构化 `solution.json`
- 根据场景选择图 / 表 / 文字
- Archify 作为主要技术关系图引擎的接口设计
- Mermaid 作为 ER / Gantt / Class 等补位引擎的接口设计
- 单页 HTML 技术方案渲染
- 自动检查事实完整性、方案一致性与过度设计

## V1 暂不做

- PDF / PPT / Word 多格式输出
- 复杂模板市场和多主题系统
- 自动维护完整架构知识库
- 自动写入 ADR 历史库
- 强制生成固定章节
- 为简单需求制造架构图或方案对比

设计文档见后续 `docs/v1-design.md`。
