# 团队分工与任务文档

Phase 2（插件实践 + CLI 插件式重构）的团队分工。一人负责一块，块内自己实现、自己验证。

## 分工总表

| 人 | 负责部分 | 交付物 | 任务文档 |
|---|---|---|---|
| 张子超 | 第一部分：VSCode 扩展 | `vscode-extension/`、示例 SVG、两张截图（含 A.3 分析） | [1-张子超-VSCode扩展](任务文档/1-张子超-VSCode扩展.md) |
| 农权淳 | 第二部分 · 内核 | `src/kernel/`、改造后的 `CommandRegistry`、组合根、扩展点清单 | [2-农权淳-内核与扩展点](任务文档/2-农权淳-内核与扩展点.md) |
| 张杰 | 第二部分 · 图形插件 | `plugins/shape-*`、`plugins/shape-box/`、box ADR | [3-张杰-图形插件](任务文档/3-张杰-图形插件.md) |
| 殷放 | 第二部分 · 命令与标签插件 | `plugins/command-stats/`、`plugins/command-dir/`、`plugins/fs-dir/`、`plugins/tree-*` | [4-殷放-命令与标签插件](任务文档/4-殷放-命令与标签插件.md) |
| 陈智凯 | 第二部分 · 装配与判据 | `src/host/PluginLoader.ts`、`plugins.config.json`、`scripts/verify/`、`scripts/metrics/` | [5-陈智凯-装配与判据](任务文档/5-陈智凯-装配与判据.md) |
| 钟杭延 | 第三部分：dsh 插件 | 提案、设计文档、可运行插件、README | [6-钟杭延-dsh插件](任务文档/6-钟杭延-dsh插件.md) |

## 其他文档

- [任务分工](任务分工.md)：各部分的任务说明与自验要点。

## 约定

- 基线是 tag `final`，结束时打 tag `p2`。
- 一人一个分支（`feat/kernel`、`feat/shapes`、`feat/commands-decorators`、`feat/host`、`feat/part1-vscode`、`feat/dsh-plugin`）。
- 合并到 `main` 用 merge 或 rebase，**不要 squash**。
- 自验证据放 `doc/evidence/<模块>/`。
