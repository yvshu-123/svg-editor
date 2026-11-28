import { Rect } from '../../../src/domain/Rect.js';
import { defineShapePlugin, expectCount, numberAt } from '../../shape-support.js';

export default defineShapePlugin({
  kind: 'rect',
  svgAttributes: ['x', 'y', 'width', 'height'],
  create(id, params) {
    expectCount(params, 4, 5, 'create rect <id> <x> <y> <w> <h> [fill]');
    return new Rect(id, {
      x: numberAt(params, 0, 'x'),
      y: numberAt(params, 1, 'y'),
      width: numberAt(params, 2, 'width'),
      height: numberAt(params, 3, 'height'),
      fill: params[4],
    });
  },
});
