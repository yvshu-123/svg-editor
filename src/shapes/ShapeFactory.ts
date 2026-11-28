import type { Shape } from '../domain/Shape.js';
import type { Registry } from '../kernel/Registry.js';
import type { ShapeProvider } from '../kernel/ShapeProvider.js';
import { AppError } from '../shared/AppError.js';

export class ShapeFactory {
  constructor(private readonly shapes: Pick<Registry<ShapeProvider>, 'get'>) {}

  provider(kind: string): ShapeProvider | undefined {
    return this.shapes.get(kind);
  }

  has(kind: string): boolean {
    return this.provider(kind) !== undefined;
  }

  svgAttributeNames(kind: string): readonly string[] {
    return this.requireProvider(kind).svgAttributes;
  }

  usesTextContent(kind: string): boolean {
    return this.requireProvider(kind).hasTextContent === true;
  }

  create(kind: string, id: string, params: string[]): Shape {
    return this.requireProvider(kind).create(id, params);
  }

  private requireProvider(kind: string): ShapeProvider {
    const provider = this.provider(kind);
    if (provider === undefined) {
      throw new AppError(`unknown shape type: ${kind} (is the plugin loaded?)`);
    }
    return provider;
  }
}
