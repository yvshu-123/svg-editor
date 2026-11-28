import { expect, it } from 'vitest';
import { boxProvider, BoxShape } from '../support/box.js';
import { createCliSession } from '../support/cli.js';

it('set 先匹配处理器，找不到时沿用图形白名单与错误', () => {
  const { context, document, repl } = createCliSession();
  context.shapes.register(boxProvider.kind, boxProvider);
  context.attributes.register('sample-label', {
    handles: (shape, attribute) => shape instanceof BoxShape && attribute === 'label',
    apply(shape, _attribute, value) {
      (shape as BoxShape).children[1]!.setAttribute('text', value);
    },
  });

  repl.handleLine('init');
  repl.handleLine('create rect r1 0 0 1 1');
  expect(repl.handleLine('set r1 fill red')).toEqual(['rect#r1 updated: fill=red']);
  expect(repl.handleLine('set r1 opacity 0.5')).toEqual(['error: unknown attribute: opacity']);
  repl.handleLine('create box n1 120 100 160 60 "开始"');
  expect(repl.handleLine('set n1 label "开始 v2"')).toEqual(['box#n1 updated: label=开始 v2']);
  expect(document.find('n1-label').textContent()).toBe('开始 v2');
  expect(repl.handleLine('undo')).toEqual(['box#n1 updated: label=开始']);
  expect(document.find('n1-label').textContent()).toBe('开始');
  expect(repl.handleLine('redo')).toEqual(['box#n1 updated: label=开始 v2']);
  expect(document.find('n1-label').textContent()).toBe('开始 v2');
});

it('命中的处理器抛错时恢复文档，保留 undo 与 redo 且不回退到白名单', () => {
  const { context, document, repl } = createCliSession();
  const boom = new Error('attribute rejected after mutation');
  context.attributes.register('failing-handler', {
    handles: (shape, attribute) => shape.id === 'r1' && attribute === 'fill',
    apply(shape) {
      shape.setAttribute('x', '999');
      throw boom;
    },
  });
  repl.handleLine('init');
  repl.handleLine('create rect r1 0 0 1 1');
  repl.handleLine('move r1 10 0');
  repl.handleLine('move r1 20 0');
  repl.handleLine('undo');
  repl.handleLine('undo');
  const before = repl.handleLine('tree');
  const notifications: string[] = [];
  context.on('document:changed', ({ reason }) => notifications.push(reason));

  expect(repl.handleLine('set r1 fill red')).toEqual(['error: attribute rejected after mutation']);
  expect(repl.handleLine('tree')).toEqual(before);
  expect(document.find('r1').getAttribute('x')).toBe('0');
  expect(document.find('r1').getAttribute('fill')).toBeUndefined();
  expect(notifications).toEqual([]);

  expect(repl.handleLine('redo')).toEqual(['rect#r1 moved to (10,0)']);
  expect(repl.handleLine('redo')).toEqual(['rect#r1 moved to (30,0)']);
  expect(repl.handleLine('redo')).toEqual(['error: nothing to redo']);
  expect(repl.handleLine('undo')).toEqual(['rect#r1 moved back to (10,0)']);
  expect(repl.handleLine('undo')).toEqual(['rect#r1 moved back to (0,0)']);
  expect(repl.handleLine('undo')).toEqual(['rect#r1 creation undone']);
  expect(repl.handleLine('undo')).toEqual(['error: nothing to undo']);
});
