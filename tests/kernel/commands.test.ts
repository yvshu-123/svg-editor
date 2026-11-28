import { expect, it } from 'vitest';
import { HelpCommand } from '../../src/command/commands/HelpCommand.js';
import { createCliSession } from '../support/cli.js';

it('无需文档的命令注册后可执行，且帮助追加在末尾', () => {
  const { context, repl } = createCliSession();

  const baseHelp = repl.handleLine('help');
  expect(baseHelp).not.toContain('  greet                          打招呼');
  expect(repl.handleLine('greet')).toEqual(['error: unknown command: greet']);
  expect(repl.handleLine('undo')).toEqual(["error: no document. use 'init' or 'read' first"]);
  expect(repl.handleLine('redo')).toEqual(["error: no document. use 'init' or 'read' first"]);

  const external = {
    name: 'greet',
    usage: 'greet',
    help: '打招呼',
    helpSection: 'document' as const,
    requiresDocument: false,
    build: () => new HelpCommand(['hello']),
  };
  context.commands.register('greet', external);

  expect(repl.handleLine('greet')).toEqual(['hello']);
  expect(repl.handleLine('help')).toEqual([...baseHelp, '', '  greet                          打招呼']);
});

it('插件登记保留的 REPL 名称时立即报重名', () => {
  const { context, repl } = createCliSession();
  const help = repl.handleLine('help');
  for (const name of ['undo', 'redo', 'quit', 'exit']) {
    const activation = context.beginActivation();
    expect(() => activation.context.commands.register(name, {
      name, usage: name, help: 'collision', requiresDocument: false,
      build: () => new HelpCommand([]),
    })).toThrow(`duplicate registration: commands/${name}`);
    activation.rollback();
  }
  expect(repl.handleLine('help')).toEqual(help);
});
