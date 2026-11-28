import type { Shape } from '../domain/Shape.js';

export interface AttributeHandler {
  handles(shape: Shape, attribute: string): boolean;
  apply(shape: Shape, attribute: string, value: string): void;
}
