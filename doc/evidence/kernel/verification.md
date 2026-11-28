# 内核验收记录

2026-11-28 复验通过任务单 §3 的全部 8 项。Phase 1 基线使用 `final` 指向的提交 `4ec5c9e`，两版 CLI 使用同一工作目录、输入和依赖。

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

`diff` 退出码为 `0`，标准输出为空。单独复跑了初始化前后的 `tree` 和普通 SVG 的 `read → tree → save`。会话输出和保存文件均与 `final` 逐字节一致。 [回放输入](../../transcript/cli-1.txt)、[标准输出基线](../../transcript/cli-1.expected)

## 内核与 CLI 源码边界

```bash
rg -n "box|stats|'dir'|plugin-" src/kernel src/cli
```

搜索无命中。另用整词 `dir` 搜索，结果相同。

## 四类扩展点示例

相关的 4 个测试文件共 10 项通过。

- `ShapeProvider` 注册测试用复合图形，验证创建、部件保护、整体平移、SVG 读回及降级。 [图形测试](../../../tests/kernel/shapes.test.ts#L28)
- `CommandPlugin` 注册 `greet`，验证它可以在初始化前执行，且帮助追加在末尾。 [命令测试](../../../tests/kernel/commands.test.ts#L5)
- `TreeDecorator` 注册 `sample-tag`，验证编辑、撤销、重做和保存后的树标签。 [标签测试](../../../tests/kernel/tree-decorator.test.ts#L4)
- `AttributeHandler` 注册 `sample-label`，验证 `set` 写入复合图形的文字并支持撤销和重做。 [属性测试](../../../tests/kernel/attributes.test.ts#L5)

## 处理器失败回滚

单独复跑了失败用例。失败前保留 1 条撤销和 2 条重做记录。处理器修改坐标后抛错，CLI 返回原错误，树和属性恢复。随后按原顺序重做、撤销，并核对两侧栈清空时的报错。失败编辑未发出变更通知。 [失败回滚测试](../../../tests/kernel/attributes.test.ts#L28)

## help 基线

通过 `git show final:src/cli/HelpText.ts` 读取旧帮助，并独立执行当前 CLI 的 `help`。35 行帮助的字节完全相同，包含空格和换行。

## 扩展点清单链接

逐条解析并打开清单中的 54 处文件链接，其中 35 处行号锚点均定位到所标注的函数签名。 [扩展点清单](../../parts/kernel.md)

## 相对 final 的内核变更

```bash
git diff final -- src/kernel | rg -n "box|stats|'dir'|plugin-"
```

内核 diff 有内容，具体插件名搜索无命中。

## 配置装配

真实 CLI 使用临时模块及配置回放，命令通过 `options` 接收到配置值。三次运行的输出片段如下。 [配置失败与回滚测试](../../../tests/kernel/configuration.test.ts)

```text
svg> enabled by configuration
svg> error: unknown command: configured
error: invalid plugin config
svg> canvas 800x600 created
```
