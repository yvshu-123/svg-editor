import { Line } from '../../../src/domain/Line.js';
import { defineShapePlugin, expectCount, numberAt } from '../../shape-support.js';

export default defineShapePlugin({
  kind: 'line',
  svgAttributes: ['x1', 'y1', 'x2', 'y2'],
  create(id, params) {
    expectCount(params, 4, 5, 'create line <id> <x1> <y1> <x2> <y2> [stroke]');
    return new Line(id, {
      x1: numberAt(params, 0, 'x1'),
      y1: numberAt(params, 1, 'y1'),
      x2: numberAt(params, 2, 'x2'),
      y2: numberAt(params, 3, 'y2'),
      stroke: params[4],
    });
  },
});
