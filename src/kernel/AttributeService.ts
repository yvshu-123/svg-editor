import type { Shape } from '../domain/Shape.js';
import type { AttributeHandler } from './AttributeHandler.js';
import type { Registry } from './Registry.js';

export class AttributeService {
  constructor(private readonly handlers?: Pick<Registry<AttributeHandler>, 'values'>) {}

  apply(shape: Shape, attribute: string, value: string): void {
    const handler = this.handlers?.values().find((candidate) => candidate.handles(shape, attribute));
    if (handler === undefined) {
      shape.setAttribute(attribute, value);
      return;
    }
    handler.apply(shape, attribute, value);
  }
}
