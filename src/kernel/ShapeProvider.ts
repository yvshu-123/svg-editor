import type { Shape } from '../domain/Shape.js';

export interface SvgShapeInput {
  readonly id: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly textContent: string;
  readonly children: readonly Shape[];
}

export interface ShapeProvider {
  readonly kind: string;
  /** 默认读回时按此顺序取出 SVG 几何属性，作为 create 的位置参数。 */
  readonly svgAttributes: readonly string[];
  readonly hasTextContent?: boolean;
  create(id: string, params: string[]): Shape;
  /** 需要从已解析的子树恢复类型时，接管默认读回。 */
  read?(input: SvgShapeInput): Shape;
}
