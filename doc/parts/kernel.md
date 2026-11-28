# CLI 内核扩展点

## ShapeProvider

- 通过 `ctx.shapes.register(kind, provider)` 注册。提供者声明 `kind`、`svgAttributes`、可选的 `hasTextContent`，并以 `create(id, params)` 构建图形。 [ShapeProvider 定义](../../src/kernel/ShapeProvider.ts)
- CLI 的 `create` 调用 `ShapeFactory.create()`。默认读回按 `svgAttributes` 的顺序提取 XML 属性，`hasTextContent` 为真时将文本追加到参数末尾。需要重建复合图形时可实现 `read({ id, attributes, textContent, children })`，使用给定 ID 和已解析的子节点。 [ShapeFactory.ts · create](../../src/shapes/ShapeFactory.ts#L25)、[SvgReader.ts · buildElement](../../src/io/SvgReader.ts#L86)
- 现有实现为 [rect](../../plugins/shape-rect/src/index.ts)、[circle](../../plugins/shape-circle/src/index.ts)、[ellipse](../../plugins/shape-ellipse/src/index.ts)、[line](../../plugins/shape-line/src/index.ts)、[text](../../plugins/shape-text/src/index.ts) 和 [g](../../plugins/shape-group/src/index.ts)。[复合图形示例](../../tests/support/box.ts) 演示自定义读回和快照克隆。
- 未注册的类型在创建时返回 `unknown shape type: <kind> (is the plugin loaded?)`。只有实现了 `read()` 的类型才接管对应的 `data-kind`。否则按原 SVG 标签读回，例如复合容器退化为普通 `g`。注册的 `read()` 抛错时整次读入失败并显示原错误。改变输入 ID 会报 `shape provider changed SVG id: <id>`，重复 ID 会报 `id already exists: <id>`。 [ShapeFactory.ts · requireProvider](../../src/shapes/ShapeFactory.ts#L29)、[SvgReader.ts · buildElement](../../src/io/SvgReader.ts#L86)、[Document.ts · collectIds](../../src/domain/Document.ts#L135)

## CommandPlugin

- 通过 `ctx.commands.register(name, plugin)` 注册。声明 `name`、`usage`、`help`、`requiresDocument`，由 `build(args)` 校验命令参数并构建一次执行用的命令对象。打开画布的命令可声明 `opensDocument: true`，成功执行后进入已初始化状态。 [CommandPlugin 定义](../../src/kernel/CommandPlugin.ts)
- `CommandRegistry.prepare()` 先构建命令，再由 `Repl.dispatch()` 检查是否需要文档，保留 Phase 1 的报错顺序。 `HelpComposer.compose()` 读取已注册命令。字符串 `help` 与 `usage` 一起排版，字符串数组按原样显示，额外注册的命令追加在帮助末尾。 [CommandRegistry.ts · prepare](../../src/cli/CommandRegistry.ts#L14)、[Repl.ts · dispatch](../../src/cli/Repl.ts#L64)、[HelpComposer.ts · compose](../../src/cli/HelpComposer.ts#L25)
- 现有实现为 [16 条内置命令](../../src/builtins/BuiltinCommands.ts)。[greet 示例](../../tests/kernel/commands.test.ts) 演示无需文档即可执行的命令与动态帮助。
- 未注册的命令从帮助中消失，执行时返回 `unknown command: <name>`。需要文档的命令在初始化前执行会报 `no document. use 'init' or 'read' first`。内置命令的参数数量有误时返回 `usage: <usage>`。 `undo`、`redo`、`quit` 和 `exit` 是保留命令名，重复登记会报错。 [CommandRegistry.ts · prepare](../../src/cli/CommandRegistry.ts#L14)、[Repl.ts · requireDocument](../../src/cli/Repl.ts#L91)、[BuiltinCommands.ts · expectCount](../../src/builtins/BuiltinCommands.ts#L150)

## TreeDecorator

- 通过 `ctx.decorators.register(name, decorator)` 注册。 `decorate(node)` 接收只读的图形行信息 `id`、`kind` 和 `summary`，并返回标签字符串或 `undefined`。有内容的标签按注册顺序以一个空格追加到图形行末尾。画布标题单独渲染。 [TreeDecorator 定义](../../src/kernel/TreeDecorator.ts)
- `TreeFormatter.render()` 渲染完整文档和指定子树，`TreeFormatter.decorate()` 在每个图形行完成对齐后应用标签。现有示例 `sample-tag` 订阅变更事件并显示原因。 [TreeFormatter.ts · render](../../src/cli/TreeFormatter.ts#L23)、[TreeFormatter.ts · decorate](../../src/cli/TreeFormatter.ts#L68)、[标签示例与事件测试](../../tests/kernel/tree-decorator.test.ts)
- 未注册装饰器时沿用 Phase 1 的树输出。装饰器抛出的异常由 CLI 以 `error: <原错误>` 显示。 [Repl.ts · handleLine](../../src/cli/Repl.ts#L31)

## AttributeHandler

- 通过 `ctx.attributes.register(name, handler)` 注册。 `handles(shape, attribute)` 判断是否接管，`apply(shape, attribute, value)` 执行修改。需要回显扩展属性值的图形由 `getAttribute()` 提供当前值。 [AttributeHandler 定义](../../src/kernel/AttributeHandler.ts)
- `SetAttributeCommand.apply()` 调用 `AttributeService.apply()`，采用首个匹配的处理器。现有示例 `sample-label` 更新复合图形内部文本，整个修改可撤销和重做。 [SetAttributeCommand.ts · apply](../../src/command/commands/SetAttributeCommand.ts#L22)、[AttributeService.ts · apply](../../src/kernel/AttributeService.ts#L9)、[属性示例与回滚测试](../../tests/kernel/attributes.test.ts)
- 没有处理器命中时调用图形的 `setAttribute()`。白名单拒绝未知属性时返回 `unknown attribute: <name>`。命中的处理器抛错时恢复快照并抛出原错误，历史栈保持执行前的状态。 [Shape.ts · setAttribute](../../src/domain/Shape.ts#L79)、[SnapshotCommand.ts · execute](../../src/command/SnapshotCommand.ts#L18)、[CommandHistory.ts · execute](../../src/command/CommandHistory.ts#L19)

## 激活与文档通知

- `createPluginContext()` 提供共享的 `document`、四类注册表和已提交的 `registeredNames()`。加载器调用 `beginActivation()`，把返回的 `activation.context` 交给插件。 `activation.registeredNames()` 返回本次暂存的名字。声明核对通过后 `commit()` 发布所有登记和订阅，激活失败时 `rollback()` 丢弃本次暂存。 [PluginContext.ts · createPluginContext](../../src/kernel/PluginContext.ts#L41)、[PluginContext.ts · beginActivation](../../src/kernel/PluginContext.ts#L56)、[PluginLoader.ts · loadPlugin](../../src/host/PluginLoader.ts#L38)
- 同一类别中的名字必须唯一，重名报 `duplicate registration: <category>/<name>`。提交前会检查所有类别的冲突。事务结束后再次登记、查询暂存或提交会报 `registration transaction is closed`。 [Registry.ts · stage](../../src/kernel/Registry.ts#L42)、[PluginContext.ts · beginActivation](../../src/kernel/PluginContext.ts#L56)
- `ctx.on('document:changed', listener)` 订阅变更并返回取消订阅函数。事件包含当前 `document` 和 `reason`，覆盖成功的 `init`、`read`、`save`、其他 `io`、`edit`、`undo` 和 `redo`。监听器在文档和历史栈更新后读取状态，保存通知发出时保存路径已更新。失败编辑和显示命令不发通知。 [CommandHistory.ts · execute](../../src/command/CommandHistory.ts#L19)、[undo](../../src/command/CommandHistory.ts#L41)、[redo](../../src/command/CommandHistory.ts#L56)、[SaveCommand.ts · execute](../../src/command/commands/SaveCommand.ts#L16)

## 图形结构钩子

- `Shape.onDetach()` 默认允许操作。 `Document.remove()`、跨容器的 `Document.moveTo()` 和 `MoveCommand.apply()` 调用目标节点的钩子。插件可抛出错误保护必要的子部件。容器整体平移时调用的是容器自身的钩子，其内部坐标仍随容器更新。 [Document.ts · remove](../../src/domain/Document.ts#L67)、[moveTo](../../src/domain/Document.ts#L76)、[MoveCommand.ts · apply](../../src/command/commands/MoveCommand.ts#L21)
- `Shape.canUngroup()` 默认允许解组，返回 `false` 时会报 `cannot ungroup: <id>`。普通根级容器保留 Phase 1 的 `cannot ungroup top-level container: <id>`。 [UngroupCommand.ts · apply](../../src/command/commands/UngroupCommand.ts#L17)
- `Shape.svgTag()` 默认等于 `kind`，`Group.svgTag()` 返回 `g`。如果 SVG 标签与领域类型不同，写出时附加 `data-kind`，例如 `<g id="n1" data-kind="box">`。 [Group.ts · svgTag](../../src/domain/Group.ts#L27)、[SvgWriter.ts · renderShape](../../src/io/SvgWriter.ts#L49)

## CLI 装配与回归

`src/index.ts` 先激活六种基础图形和内置命令。运行 `npm run cli -- --config <path>` 可加载额外模块。模块相对路径基于配置文件所在目录，配置按 `plugins` 数组顺序加载。每个模块的默认导出对象提供 `activate(ctx, options)`，并通过包的 `package.json` 或默认导出对象声明 `contributes`。 `SVGFRAME_PLUGINS=none` 禁用配置加载。 [index.ts](../../src/index.ts)、[PluginLoader.ts · loadPlugins](../../src/host/PluginLoader.ts#L13)

从项目根目录回放。期望文件包含 Phase 1 的 npm 输出、CLI 提示符和换行，回放会在当前目录写出 `demo.svg` 和 `flowchart.svg`。 [回放输入](../transcript/cli-1.txt)、[标准输出基线](../transcript/cli-1.expected)、[验收记录](../evidence/kernel/verification.md)

```bash
SVGFRAME_PLUGINS=none npm run cli < doc/transcript/cli-1.txt | diff - doc/transcript/cli-1.expected
```
