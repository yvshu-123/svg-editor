import { expect, it } from 'vitest';
import { Document } from '../../src/domain/Document.js';
import { Group } from '../../src/domain/Group.js';
import { boxProvider } from '../support/box.js';
import { createCliSession } from '../support/cli.js';
import { MemoryFileSystem } from '../support/memoryFs.js';

it('Document.add 拒绝冲突子树时不登记前面访问过的 ID', () => {
  const document = new Document();
  document.add(new Group('taken'));
  const subtree = new Group('new-root');
  subtree.append(new Group('new-child'));
  subtree.append(new Group('taken'));

  expect(() => document.add(subtree)).toThrow('id already exists: taken');
  expect(document.children.map((child) => child.id)).toEqual(['taken']);
  expect(document.count()).toBe(1);
  expect(document.has('new-root')).toBe(false);
  expect(document.has('new-child')).toBe(false);

  const duplicate = new Group('tree');
  duplicate.append(new Group('child'));
  duplicate.append(new Group('child'));
  expect(() => document.add(duplicate)).toThrow('id already exists: child');
  expect(document.count()).toBe(1);
});

it('子部件拒绝删除、换父级和平移，容器仍然可以整体平移', () => {
  const { context, document, repl } = createCliSession();
  context.shapes.register(boxProvider.kind, boxProvider);
  repl.handleLine('init');
  repl.handleLine('create g scene');
  repl.handleLine('create g other');
  expect(repl.handleLine('create box n1 120 100 160 60 "开始" in scene')).toEqual(['box#n1 created in g#scene']);
  const tree = repl.handleLine('tree');
  const count = document.count();

  for (const line of ['delete n1-rect', 'addto other n1-rect', 'move n1-rect 10 10']) {
    expect(repl.handleLine(line)).toEqual(['error: protected component: n1-rect']);
    expect(repl.handleLine('tree')).toEqual(tree);
    expect(document.find('n1-rect').parent?.id).toBe('n1');
    expect(document.find('n1-rect').getAttribute('x')).toBe('120');
    expect(document.count()).toBe(count);
  }

  expect(repl.handleLine('ungroup n1')).toEqual(['error: cannot ungroup: n1']);
  expect(repl.handleLine('tree')).toEqual(tree);
  expect(repl.handleLine('move n1 10 10')).toEqual(['box#n1 moved by (10,10)']);
  expect(document.find('n1-rect').getAttribute('x')).toBe('130');
  expect(document.find('n1-rect').getAttribute('y')).toBe('110');
  expect(document.find('n1-label').getAttribute('x')).toBe('150');
  expect(document.find('n1-label').getAttribute('y')).toBe('145');
  expect(document.count()).toBe(count);
});

it('扩展容器保存为标准 g，启用提供者时恢复类型，否则降级为普通 g', () => {
  const fs = new MemoryFileSystem();
  const { context, document, repl } = createCliSession(fs);
  context.shapes.register(boxProvider.kind, boxProvider);
  repl.handleLine('init');
  repl.handleLine('create box n1 120 100 160 60 "开始"');
  expect(repl.handleLine('save box.svg')).toEqual(['saved to box.svg (3 elements)']);
  expect(fs.contentOf('box.svg')).toContain('<g id="n1" data-kind="box">');

  expect(repl.handleLine('read box.svg')).toEqual(['read box.svg (3 elements)']);
  expect(document.find('n1').kind).toBe('box');
  expect(repl.handleLine('delete n1-label')).toEqual(['error: protected component: n1-label']);

  const plain = createCliSession(fs);
  expect(plain.repl.handleLine('read box.svg')).toEqual(['read box.svg (3 elements)']);
  expect(plain.document.find('n1').kind).toBe('g');
  expect(plain.document.find('n1-label').textContent()).toBe('开始');

  const before = repl.handleLine('tree');
  fs.seed('invalid.svg', '<svg><g id="bad" data-kind="box"><rect id="bad-rect" x="0" y="0" width="1" height="1"/></g></svg>');
  expect(repl.handleLine('read invalid.svg')).toEqual(['error: invalid box components: bad']);
  expect(repl.handleLine('tree')).toEqual(before);

  fs.seed('duplicate.svg', '<svg><g id="bad" data-kind="box"><g id="bad"/></g></svg>');
  expect(repl.handleLine('read duplicate.svg')).toEqual(['error: id already exists: bad']);
  expect(repl.handleLine('tree')).toEqual(before);
});

it('普通 SVG 上已有的 data-kind 仍按原标签读回', () => {
  const { document, fs, repl } = createCliSession();
  fs.seed('external.svg', '<svg><rect id="r" data-kind="circle" x="0" y="0" width="10" height="20"/></svg>');

  expect(repl.handleLine('read external.svg')).toEqual(['read external.svg (1 elements)']);
  expect(document.find('r').kind).toBe('rect');
  expect(repl.handleLine('save output.svg')).toEqual(['saved to output.svg (1 elements)']);
  expect(fs.contentOf('output.svg')).toContain('<rect id="r" x="0" y="0" width="10" height="20"/>');
});

it('默认读回拒绝提供者改写输入 ID', () => {
  const { context, fs, repl } = createCliSession();
  context.shapes.register('sample', {
    kind: 'sample', svgAttributes: [], create: () => new Group('wrong-id'),
  });
  fs.seed('external.svg', '<svg><sample id="expected-id"/></svg>');

  expect(repl.handleLine('read external.svg')).toEqual(['error: shape provider changed SVG id: expected-id']);
});
