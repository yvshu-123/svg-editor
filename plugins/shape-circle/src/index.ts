import { Circle } from '../../../src/domain/Circle.js';
import { defineShapePlugin, expectCount, numberAt } from '../../shape-support.js';

export default defineShapePlugin({
  kind: 'circle',
  svgAttributes: ['cx', 'cy', 'r'],
  create(id, params) {
    expectCount(params, 3, 4, 'create circle <id> <cx> <cy> <r> [fill]');
    return new Circle(id, {
      cx: numberAt(params, 0, 'cx'),
      cy: numberAt(params, 1, 'cy'),
      r: numberAt(params, 2, 'r'),
      fill: params[3],
    });
  },
});
