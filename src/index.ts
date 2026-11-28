import rect from '../plugins/shape-rect/src/index.js';
import circle from '../plugins/shape-circle/src/index.js';
import ellipse from '../plugins/shape-ellipse/src/index.js';
import line from '../plugins/shape-line/src/index.js';
import text from '../plugins/shape-text/src/index.js';
import group from '../plugins/shape-group/src/index.js';
import { activateBuiltinCommands } from './builtins/BuiltinCommands.js';
import { CommandRegistry } from './cli/CommandRegistry.js';
import { HelpComposer } from './cli/HelpComposer.js';
import { LineTokenizer } from './cli/LineTokenizer.js';
import { Repl } from './cli/Repl.js';
import { ShowFormatter } from './cli/ShowFormatter.js';
import { TreeFormatter } from './cli/TreeFormatter.js';
import { CommandHistory } from './command/CommandHistory.js';
import { loadPlugins } from './host/PluginLoader.js';
import { NodeFileSystem } from './io/NodeFileSystem.js';
import { SvgReader } from './io/SvgReader.js';
import { SvgWriter } from './io/SvgWriter.js';
import { AttributeService } from './kernel/AttributeService.js';
import { createPluginContext } from './kernel/PluginContext.js';
import { ShapeFactory } from './shapes/ShapeFactory.js';

// 在组合根接入具体实现，CLI 与内核只读取已注册的贡献。
const fileSystem = new NodeFileSystem();
const context = createPluginContext(undefined, (error) => reportError(error instanceof Error ? error.message : String(error)));
for (const shape of [rect, circle, ellipse, line, text, group]) {
  shape.activate(context);
}
const shapeFactory = new ShapeFactory(context.shapes);
const treeFormatter = new TreeFormatter(context.decorators);
const showFormatter = new ShowFormatter();

const help = new HelpComposer(context.commands);
activateBuiltinCommands(context.commands, {
  factory: shapeFactory,
  attributes: new AttributeService(context.attributes),
  reader: new SvgReader(fileSystem, shapeFactory),
  writer: new SvgWriter(fileSystem),
  treeRenderer: (document, rootId) => treeFormatter.render(document, rootId),
  shapeRenderer: (document, id) => showFormatter.render(document, id),
  helpLines: () => help.compose(),
});
const registry = new CommandRegistry(context.commands);

const repl = new Repl({
  document: context.document,
  history: new CommandHistory(context.emitDocumentChanged),
  registry,
  tokenizer: new LineTokenizer(),
});

const args = process.argv.slice(2);
const configIndex = args.indexOf('--config');
if (configIndex !== -1 && process.env.SVGFRAME_PLUGINS !== 'none') {
  const config = args[configIndex + 1];
  if (!config || config.startsWith('--')) {
    reportError('invalid plugin config');
  } else {
    await loadPlugins(config, context, reportError);
  }
}

repl.start();

function reportError(message: string): void {
  process.stderr.write(`error: ${message}\n`);
}
