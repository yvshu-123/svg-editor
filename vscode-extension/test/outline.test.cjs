const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { parseOutline } = require('../dist/outline');

test('example preserves hierarchy, IDs and anonymous nodes', () => {
  const source = readFileSync(join(__dirname, '../example.svg'), 'utf8');
  const [root] = parseOutline(source);
  const [workflow] = root.children;
  assert.equal(root.name, 'svg');
  assert.deepEqual(workflow.children.map(node => node.name), ['g#step', 'path#arrow', 'circle#finish']);
  assert.deepEqual(workflow.children[0].children.map(node => node.name), ['rect#start', 'text']);
  assert.equal(source.slice(root.start, root.end), source.trimEnd());
});

test('ranges use original UTF-16 offsets, quoted delimiters and actual closing tags', () => {
  const group = '<g title="a > b">\r\n<text>🙂</text><!--</g>--><![CDATA[</g>]]><?hint </g>?></g>';
  const source = '<?xml version="1.0"?>\r\n<svg>' + group + '<g/></svg>';
  const [first, second] = parseOutline(source)[0].children;
  assert.equal(source.slice(first.start, first.end), group);
  assert.equal(source.slice(first.start, first.openingEnd), '<g title="a > b">');
  assert.equal(source.slice(first.children[0].start, first.children[0].end), '<text>🙂</text>');
  assert.equal(source.slice(second.start, second.end), '<g/>');
});

test('each revision reflects edits without caching', () => {
  assert.equal(parseOutline('<svg><rect/></svg>')[0].children[0].name, 'rect');
  const [root] = parseOutline('<svg><g><rect id="x"/></g></svg>');
  assert.equal(root.children[0].children[0].name, 'rect#x');
});

test('recognizes qualified SVG elements and preserves their source names', () => {
  const [root] = parseOutline('<s:svg xmlns:s="http://www.w3.org/2000/svg"><s:g/></s:svg>');
  assert.equal(root.children[0].name, 's:g');
});

test('unfinished, malformed, oversized and non-SVG documents yield an empty outline', () => {
  for (const input of ['', '<svg><g></svg>', '<svg><re', '<svg><rect attr=bad /></svg>',
    '<svg><parsererror/></svg>', '<html/>', '<svg>' + ' '.repeat(2 ** 21) + '</svg>']) {
    assert.deepEqual(parseOutline(input), []);
  }
});
