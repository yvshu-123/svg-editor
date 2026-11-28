import { TextShape } from '../../../src/domain/TextShape.js';
import { defineShapePlugin, expectCount, numberAt } from '../../shape-support.js';

export default defineShapePlugin({
  kind: 'text',
  svgAttributes: ['x', 'y'],
  hasTextContent: true,
  create(id, params) {
    expectCount(params, 3, 3, 'create text <id> <x> <y> "content"');
    return new TextShape(id, {
      x: numberAt(params, 0, 'x'),
      y: numberAt(params, 1, 'y'),
      content: params[2] ?? '',
    });
  },
});
