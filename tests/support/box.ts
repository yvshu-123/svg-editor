import { Group } from '../../src/domain/Group.js';
import { Rect } from '../../src/domain/Rect.js';
import type { Shape } from '../../src/domain/Shape.js';
import { TextShape } from '../../src/domain/TextShape.js';
import type { ShapeProvider } from '../../src/kernel/ShapeProvider.js';
import { AppError } from '../../src/shared/AppError.js';

export class BoxShape extends Group {
  constructor(id: string, children: readonly Shape[]) {
    super(id);
    for (const child of children) {
      child.onDetach = () => { throw new AppError(`protected component: ${child.id}`); };
      this.append(child);
    }
  }

  override get kind(): string {
    return 'box';
  }

  override canUngroup(): boolean {
    return false;
  }

  override clone(): BoxShape {
    const copy = new BoxShape(this.id, this.children.map((child) => child.clone()));
    this.copyStyleTo(copy);
    return copy;
  }

  override getAttribute(name: string): string | undefined {
    return name === 'label' ? this.children[1]?.textContent() ?? undefined : super.getAttribute(name);
  }
}

export const boxProvider: ShapeProvider = {
  kind: 'box',
  svgAttributes: [],
  create(id, [x, y, width, height, label]) {
    return new BoxShape(id, [
      new Rect(`${id}-rect`, { x: Number(x), y: Number(y), width: Number(width), height: Number(height) }),
      new TextShape(`${id}-label`, { x: Number(x) + 20, y: Number(y) + 35, content: label ?? '' }),
    ]);
  },
  read({ id, children }) {
    if (children.length !== 2
      || children[0]?.kind !== 'rect' || children[0]?.id !== `${id}-rect`
      || children[1]?.kind !== 'text' || children[1]?.id !== `${id}-label`) {
      throw new AppError(`invalid box components: ${id}`);
    }
    return new BoxShape(id, children);
  },
};
