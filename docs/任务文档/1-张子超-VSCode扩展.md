# 任务文档 · 张子超 · 第一部分：VSCode 扩展

> 分支 `feat/part1-vscode`｜提交前缀 `feat(vscode):`
> 一句话：做一个 VSCode 扩展，让 Explorer 里 `.svg` 显示 `[]` 标记，打开 SVG 能在原生大纲里看到元素层级。

## 0. 上下文

```bash
git clone https://github.com/yvshu-123/svg-editor-lab1.git
cd svg-editor-lab1 && git checkout -b feat/part1-vscode final
npm ci && npm test        # 188 个测试，这是基线
```

- 你**只动** `vscode-extension/`、`doc/parts/vscode.md`、`doc/images/`；**不改 `src/` 任何文件**。
- 这个扩展与 CLI 完全无关，不依赖任何人，D0 就能开工。
- 指标只算 CLI，你的代码不计入重构增量，`docs/metrics/` 里单独列一行说明。

## 1. 交付清单

```text
vscode-extension/
├── package.json          # engines.vscode、activationEvents、contributes
├── tsconfig.json
├── src/extension.ts      # activate()：注册两个 provider
├── src/decoration.ts     # A.1 文件标记
├── src/symbols.ts        # A.2 大纲
├── example.svg           # 含嵌套 g、带 id 的 rect、无 id 的 text
├── README.md             # 打包、安装、启动步骤
└── .vscodeignore
doc/parts/vscode.md       # A.3 分析
doc/images/vscode-svg-badge.png
doc/images/vscode-svg-outline.png
```

## 2. 任务

| # | 任务 | 内容 | 完成标准 |
|---|---|---|---|
| 1 | 文件标记 | `FileDecorationProvider.provideFileDecoration(uri)`：`.svg` 返回 `{ badge: '[]' }`，其它一律 `undefined` | 只有 `.svg` 带 `[]`；目录、`.txt`、无扩展名文件都没有；文件名与内容不变 |
| 2 | SVG 大纲 | `DocumentSymbolProvider.provideDocumentSymbols(document)`：用 `@xmldom/xmldom` 解析 `document.getText()`，递归元素节点，`name = id ? \`${tagName}#${id}\` : tagName`，`kind = SymbolKind.Object`，`range` 覆盖整个元素、`selectionRange` 落在开始标签 | 层级与嵌套一致；`rect#start` 带 id，无 id 的只显示 `text`；点击跳行正确 |
| 3 | 异常输入 | 解析失败、标签不闭合、`parsererror` 一律返回空数组 | 删掉 `</g>`、删掉半个标签，大纲清空但扩展不崩、不弹红框 |
| 4 | 编辑后刷新 | 文档修改后大纲要更新（VSCode 会重新调用 provider，验证一次即可确认） | 改 id、加子元素，大纲立刻变 |
| 5 | A.3 分析 | ①VSCode 与插件谁管什么、插件怎么注册、VSCode 怎么回调；②文件装饰 vs 经典 Decorator vs Adapter 的对应与差异；③Phase 1 代码复用评估 | 三条都有结论；复用评估要指到 `src/domain/`、`src/io/SvgReader.ts`、`src/command/`、`src/cli/Repl.ts`、`src/io/FileSystemPort.ts` 这些真实文件 |
| 6 | 证据 | 示例 SVG、两张真实运行截图、`vsce package` 打包 | 截图是真实窗口；`.vsix` 能装进干净 VSCode |

**A.3 复用评估的现成素材**（Phase 1 代码已读过）：

| 能复用 | 为什么 | 不能复用 | 为什么 |
|---|---|---|---|
| `src/domain/` 的 `Shape`/`Group`/`Document` | 纯内存树，无 IO 依赖，可直接建大纲模型 | `src/command/`、`src/cli/Repl.ts` | 命令行语义，VSCode 侧没有命令行 |
| `src/io/SvgReader.ts` 的解析思路 | 也是 `@xmldom/xmldom`，同一套依赖 | `src/io/FileSystemPort.ts` | VSCode 有 `workspace.fs`，不该再包一层 Node IO |

## 3. 自验清单

- [ ] `cd vscode-extension && npm i && npx vsce package` 生成 `.vsix`
- [ ] `code --install-extension xxx.vsix` 装进干净窗口，重启后生效
- [ ] 打开一个含 3 个 `.svg` + 目录 + `.txt` 的工作区：只有 `.svg` 有 `[]`
- [ ] 重命名 `.svg` → `.txt`，标记消失；改回 `.svg`，标记回来
- [ ] 切换深色/浅色主题、切换文件图标主题，标记仍在
- [ ] 打开 `example.svg`：大纲层级正确、`rect#start` 显示带 id、无 id 的 `text` 只显示标签名
- [ ] 点击大纲节点，编辑器跳到对应行
- [ ] 编辑：给元素加 id，大纲从 `rect` 变成 `rect#x`；加一个子 `g`，层级多一层
- [ ] 故意删掉一个 `</g>`：大纲清空，扩展不崩、不报错
- [ ] 关掉扩展（禁用）后重新打开：标记与大图同时消失，说明不是改文件做到的

## 4. 交付给谁

- `doc/parts/vscode.md` 交给张子超自己合并进 `doc/README.md`。
- 无下游依赖，别人不等你。

## 5. 容易踩的坑

1. **VSCode 对目录也会调 `provideFileDecoration`**，必须显式判断 `uri.fsPath` 是不是目录、扩展名是不是 `.svg`，否则目录也会冒出 `[]`。
2. **badge 最多 2 个字符**，`[]` 刚好；别用中文或 emoji。
3. **不要为了让标记出现去改文件名或写扩展名**——判分要求"界面附加信息"。
4. **SVG 的根 `<svg>`** 要不要在大纲里显示一层，自己定并写进文档（两种都能接受，但要说清）。
5. **解析性能**：`provideDocumentSymbols` 在每次输入时都会被调用，先判断文本长度（比如 > 2 MB 直接返回空），避免卡住编辑器。
6. **截图**要真实运行效果，不要 PS 或截文档里的示意图。
