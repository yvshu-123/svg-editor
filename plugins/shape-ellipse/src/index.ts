import { Ellipse } from '../../../src/domain/Ellipse.js';
import { defineShapePlugin, expectCount, numberAt } from '../../shape-support.js';

export default defineShapePlugin({
  kind: 'ellipse',
  svgAttributes: ['cx', 'cy', 'rx', 'ry'],
  create(id, params) {
    expectCount(params, 4, 5, 'create ellipse <id> <cx> <cy> <rx> <ry> [fill]');
    return new Ellipse(id, {
      cx: numberAt(params, 0, 'cx'),
      cy: numberAt(params, 1, 'cy'),
      rx: numberAt(params, 2, 'rx'),
      ry: numberAt(params, 3, 'ry'),
      fill: params[4],
    });
  },
});
