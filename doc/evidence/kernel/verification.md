# 内核验收记录

Phase 1 基线使用 `final` 指向的提交 `4ec5c9e`。回放在同一个临时目录依次运行两版 CLI，使用同一输入和依赖。

## 类型检查与全量测试

```bash
npm run typecheck && npm test
```

```text
 Test Files  25 passed (25)
      Tests  201 passed (201)
```

旧验收文件从首个 `describe` 开始与 `final` 内容逐字节一致。 [会话断言](../../../tests/acceptance/transcript.test.ts)

## CLI 标准输出

```bash
SVGFRAME_PLUGINS=none npm run cli < doc/transcript/cli-1.txt | diff - doc/transcript/cli-1.expected
```

`diff` 退出码为 `0`，标准输出为空。另核对了 `final:src/cli/HelpText.ts` 中 35 行帮助、初始化前后的 `tree`，以及普通 SVG 的 `read → tree → save`。普通 SVG 会话输出和保存文件均逐字节一致。 [回放输入](../../transcript/cli-1.txt)、[标准输出基线](../../transcript/cli-1.expected)

## 内核边界

```bash
rg -n "box|stats|'dir'|plugin-" src/kernel src/cli
git diff final -- src/kernel | rg -n "box|stats|'dir'|plugin-"
```

两条搜索均无命中。

## 配置装配

真实 CLI 使用临时模块及配置回放，命令通过 `options` 接收到配置值。三次运行的输出片段如下。 [配置失败与回滚测试](../../../tests/kernel/configuration.test.ts)

```text
svg> enabled by configuration
svg> error: unknown command: configured
error: invalid plugin config
svg> canvas 800x600 created
```
