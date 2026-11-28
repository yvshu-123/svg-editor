import type { Document } from '../domain/Document.js';
import type { Shape } from '../domain/Shape.js';

export interface TreeDecorator {
  /** 返回追加到图形行末尾的标签，无标签时返回 undefined。 */
  decorate(shape: Shape, document: Document): string | undefined;
}
