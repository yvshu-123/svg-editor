import rect from '../../plugins/shape-rect/src/index.js';
import circle from '../../plugins/shape-circle/src/index.js';
import ellipse from '../../plugins/shape-ellipse/src/index.js';
import line from '../../plugins/shape-line/src/index.js';
import text from '../../plugins/shape-text/src/index.js';
import group from '../../plugins/shape-group/src/index.js';
import { createPluginContext } from '../../src/kernel/PluginContext.js';
import { ShapeFactory } from '../../src/shapes/ShapeFactory.js';

export function createShapeFactory(context = createPluginContext()): ShapeFactory {
  for (const shape of [rect, circle, ellipse, line, text, group]) {
    shape.activate(context);
  }
  return new ShapeFactory(context.shapes);
}
