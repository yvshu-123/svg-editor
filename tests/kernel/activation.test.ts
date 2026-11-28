import { expect, it } from 'vitest';
import { HelpCommand } from '../../src/command/commands/HelpCommand.js';
import { Group } from '../../src/domain/Group.js';
import { createCliSession } from '../support/cli.js';

it('激活提交前对 CLI 不可见，重名后回滚只丢弃本次贡献', () => {
  const { context, repl } = createCliSession();
  const before = repl.handleLine('help');
  const activation = context.beginActivation();
  activation.context.commands.register('sample', {
    name: 'sample',
    usage: 'sample',
    help: 'extension example',
    requiresDocument: false,
    build: () => new HelpCommand(['sample result']),
  });

  expect(activation.registeredNames()).toEqual({
    shapes: [], commands: ['sample'], decorators: [], attributes: [],
  });
  expect(context.registeredNames().commands).toContain('help');
  expect(context.registeredNames().commands).not.toContain('sample');
  expect(repl.handleLine('sample')).toEqual(['error: unknown command: sample']);
  expect(repl.handleLine('help')).toEqual(before);

  expect(() => activation.context.commands.register('help', context.commands.get('help')!))
    .toThrow('duplicate registration: commands/help');
  activation.rollback();

  expect(repl.handleLine('sample')).toEqual(['error: unknown command: sample']);
  expect(repl.handleLine('help')).toEqual(before);
  expect(() => activation.commit()).toThrow('registration transaction is closed');
});

it('各类别允许同名，提交按类别发布且并行激活的冲突不会部分提交', () => {
  const { context } = createCliSession();
  const first = context.beginActivation();
  const second = context.beginActivation();
  const command = {
    name: 'sample',
    usage: 'sample',
    help: 'extension example',
    requiresDocument: false,
    build: () => new HelpCommand([]),
  };

  first.context.shapes.register('sample', {
    kind: 'sample', svgAttributes: [], create: (id: string) => new Group(id),
  });
  first.context.commands.register('sample', command);
  first.context.decorators.register('sample', { decorate: () => undefined });
  first.context.attributes.register('sample', { handles: () => false, apply: () => {} });
  second.context.shapes.register('other', {
    kind: 'other', svgAttributes: [], create: (id: string) => new Group(id),
  });
  second.context.commands.register('sample', command);
  expect(() => second.context.commands.register('sample', command))
    .toThrow('duplicate registration: commands/sample');
  first.commit();
  expect(() => second.commit()).toThrow('duplicate registration: commands/sample');
  second.rollback();

  const names = context.registeredNames();
  expect(names.shapes).toContain('sample');
  expect(names.shapes).not.toContain('other');
  expect(names.commands).toContain('sample');
  expect(names.decorators).toEqual(['sample']);
  expect(names.attributes).toEqual(['sample']);
});
