import { expect, it } from 'vitest';
import { createCliSession } from '../support/cli.js';

it('提交后标签能读取编辑、撤销、重做和保存后的状态', () => {
  const { context, document, repl } = createCliSession();
  const reasons: string[] = [];
  let lastChange: string | undefined;
  let savePath: string | null = null;
  let decoratedNode: unknown;
  const activation = context.beginActivation();
  activation.context.decorators.register('sample-tag', {
    decorate(node) {
      if (node.id === 'r1') {
        decoratedNode = node;
        return lastChange;
      }
      return undefined;
    },
  });
  const unsubscribe = activation.context.on('document:changed', (event) => {
    expect(event.document).toBe(document);
    reasons.push(event.reason);
    lastChange = event.reason;
    savePath = event.document.sourcePath;
  });

  repl.handleLine('init');
  activation.commit();
  repl.handleLine('create rect r1 0 0 1 1');
  expect(repl.handleLine('tree r1')).toEqual(['rect#r1 x=0 y=0 w=1 h=1 edit']);
  expect(decoratedNode).toEqual({ id: 'r1', kind: 'rect', summary: 'x=0 y=0 w=1 h=1' });
  repl.handleLine('move r1 10 0');
  repl.handleLine('undo');
  expect(repl.handleLine('tree')).toEqual(['svg (800x600)', '└── rect#r1  x=0 y=0 w=1 h=1 undo']);
  repl.handleLine('redo');
  expect(repl.handleLine('tree r1')).toEqual(['rect#r1 x=10 y=0 w=1 h=1 redo']);
  expect(repl.handleLine('save test.svg')).toEqual(['saved to test.svg (1 elements)']);
  expect(repl.handleLine('tree r1')).toEqual(['rect#r1 x=10 y=0 w=1 h=1 save']);
  expect(savePath).toBe('test.svg');
  expect(reasons).toEqual(['edit', 'edit', 'undo', 'redo', 'save']);

  const discarded = context.beginActivation();
  const calls: string[] = [];
  discarded.context.on('document:changed', ({ reason }) => calls.push(reason));
  discarded.rollback();
  unsubscribe();
  repl.handleLine('move r1 1 0');
  expect(calls).toEqual([]);
  expect(reasons).toEqual(['edit', 'edit', 'undo', 'redo', 'save']);
});
