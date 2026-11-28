import { Group } from '../../../src/domain/Group.js';
import { defineShapePlugin, expectCount } from '../../shape-support.js';

export default defineShapePlugin({
  kind: 'g',
  svgAttributes: [],
  create(id, params) {
    expectCount(params, 0, 0, 'create g <id>');
    return new Group(id);
  },
});
