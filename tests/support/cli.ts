import { activateBuiltinCommands } from '../../src/builtins/BuiltinCommands.js';
import { CommandRegistry } from '../../src/cli/CommandRegistry.js';
import { HelpComposer } from '../../src/cli/HelpComposer.js';
import { LineTokenizer } from '../../src/cli/LineTokenizer.js';
import { Repl } from '../../src/cli/Repl.js';
import { ShowFormatter } from '../../src/cli/ShowFormatter.js';
import { TreeFormatter } from '../../src/cli/TreeFormatter.js';
import { CommandHistory } from '../../src/command/CommandHistory.js';
import { SvgReader } from '../../src/io/SvgReader.js';
import { SvgWriter } from '../../src/io/SvgWriter.js';
import { createPluginContext } from '../../src/kernel/PluginContext.js';
import { MemoryFileSystem } from './memoryFs.js';
import { createShapeFactory } from './shapes.js';

export function createCliSession(fs = new MemoryFileSystem(), helpLines?: () => readonly string[]) {
  const context = createPluginContext();
  const factory = createShapeFactory(context);
  const tree = new TreeFormatter();
  const show = new ShowFormatter();
  const help = new HelpComposer(context.commands);
  activateBuiltinCommands(context.commands, {
    factory,
    reader: new SvgReader(fs, factory),
    writer: new SvgWriter(fs),
    treeRenderer: (document, rootId) => tree.render(document, rootId),
    shapeRenderer: (document, id) => show.render(document, id),
    helpLines: helpLines ?? (() => help.compose()),
  });

  const { document } = context;
  const history = new CommandHistory();
  const registry = new CommandRegistry(context.commands);
  const tokenizer = new LineTokenizer();
  const repl = new Repl({ document, history, registry, tokenizer });
  return { context, document, fs, history, registry, repl, tokenizer };
}
