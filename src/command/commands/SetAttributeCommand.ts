import type { Document } from '../../domain/Document.js';
import type { AttributeSetter } from '../../ports/Ports.js';
import { SnapshotCommand } from '../SnapshotCommand.js';

const defaultAttributes: AttributeSetter = {
  apply: (shape, attribute, value) => shape.setAttribute(attribute, value),
};

/** set <id> <attr> <value>：通过属性服务分派，以一条编辑命令撤销。 */
export class SetAttributeCommand extends SnapshotCommand {
  private label = '';

  constructor(
    private readonly shapeId: string,
    private readonly attribute: string,
    private readonly value: string,
    private readonly attributes = defaultAttributes,
  ) {
    super();
  }

  protected apply(document: Document): void {
    const shape = document.find(this.shapeId);
    this.label = `${shape.kind}#${shape.id}`;
    this.attributes.apply(shape, this.attribute, this.value);
  }

  protected describe(document: Document): string[] {
    const current = document.find(this.shapeId).getAttribute(this.attribute) ?? '';
    const shown = this.attribute === 'text' ? JSON.stringify(current) : current;
    return [`${this.label} updated: ${this.attribute}=${shown}`];
  }
}
