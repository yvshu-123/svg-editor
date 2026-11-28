import { DOMParser } from '@xmldom/xmldom';
import type { Element as XmlElement } from '@xmldom/xmldom';
import { Document } from '../domain/Document.js';
import type { Group } from '../domain/Group.js';
import { IdAllocator } from '../domain/IdAllocator.js';
import type { Shape } from '../domain/Shape.js';
import type { ShapeFactory } from '../shapes/ShapeFactory.js';
import { AppError } from '../shared/AppError.js';
import { parseNumber } from '../shared/NumberFormat.js';
import type { FileSystemPort } from './FileSystemPort.js';
import type { ReadResult } from '../ports/Ports.js';

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const STYLE_ATTRIBUTES = ['fill', 'stroke', 'stroke-width'] as const;

interface ReadState {
  readonly allocator: IdAllocator;
  readonly ids: Set<string>;
  readonly warnings: string[];
}

/**
 * SVG 反序列化：DOM → 领域对象。
 * 缺 id 的按 `标签名+序号` 补，不认识的标签跳过，两种都记警告。
 */
export class SvgReader {
  constructor(
    private readonly fileSystem: FileSystemPort,
    private readonly factory: ShapeFactory,
  ) {}

  read(path: string): ReadResult {
    let source: string;
    try {
      source = this.fileSystem.readText(path);
    } catch {
      throw new AppError(`cannot read file: ${path}`);
    }
    return this.parse(source, path);
  }

  parse(source: string, label = 'svg'): ReadResult {
    let fatal = false;
    let root: XmlElement | null = null;

    try {
      const parser = new DOMParser({
        onError: (level: string) => {
          if (level === 'fatalError') {
            fatal = true;
          }
        },
      });
      const xml = parser.parseFromString(source, 'image/svg+xml');
      root = xml.documentElement as XmlElement | null;
    } catch {
      throw new AppError(`invalid svg: ${label}`);
    }

    if (fatal || root === null || (root.localName ?? root.tagName) !== 'svg') {
      throw new AppError(`invalid svg: ${label}`);
    }

    const document = new Document(
      this.dimension(root, 'width') ?? this.viewBoxDimension(root, 0) ?? DEFAULT_WIDTH,
      this.dimension(root, 'height') ?? this.viewBoxDimension(root, 1) ?? DEFAULT_HEIGHT,
    );
    const ids = new Set<string>();
    const state: ReadState = {
      ids,
      allocator: new IdAllocator((id) => ids.has(id) || document.has(id)),
      warnings: [],
    };

    for (const element of this.childElements(root)) {
      const shape = this.buildElement(element, state);
      if (shape !== undefined) {
        document.add(shape);
      }
    }

    return { document, warnings: state.warnings };
  }

  private buildElement(element: XmlElement, state: ReadState): Shape | undefined {
    const tag = element.localName ?? element.tagName;
    const kind = element.getAttribute('data-kind');
    const provider = (kind ? this.factory.provider(kind) : undefined) ?? this.factory.provider(tag);
    if (provider === undefined) {
      state.warnings.push(`warning: unsupported element <${tag}> skipped`);
      return undefined;
    }

    const id = this.resolveId(element, tag, state.allocator, state.warnings);
    if (provider.read !== undefined) {
      this.reserveId(id, state);
      const shape = provider.read({
        id,
        attributes: this.readAttributes(element),
        textContent: element.textContent ?? '',
        children: this.buildChildren(element, state),
      });
      if (shape.id !== id) {
        throw new AppError(`shape provider changed SVG id: ${id}`);
      }
      this.applyStyle(shape, element);
      return shape;
    }

    const params = provider.svgAttributes.map((name) => element.getAttribute(name) ?? '0');
    if (provider.hasTextContent) {
      params.push(element.textContent ?? '');
    }
    const shape = provider.create(id, params);
    this.applyStyle(shape, element);
    this.reserveId(id, state);
    if (shape.acceptsChildren()) {
      for (const child of this.buildChildren(element, state)) {
        (shape as Group).append(child);
      }
    }
    return shape;
  }

  private buildChildren(element: XmlElement, state: ReadState): Shape[] {
    const children: Shape[] = [];
    for (const child of this.childElements(element)) {
      const shape = this.buildElement(child, state);
      if (shape !== undefined) {
        children.push(shape);
      }
    }
    return children;
  }

  private reserveId(id: string, state: ReadState): void {
    if (state.ids.has(id)) {
      throw new AppError(`id already exists: ${id}`);
    }
    state.ids.add(id);
  }

  private readAttributes(element: XmlElement): Record<string, string> {
    const attributes: Array<[string, string]> = [];
    for (let index = 0; index < element.attributes.length; index += 1) {
      const attribute = element.attributes.item(index);
      if (attribute !== null) {
        attributes.push([attribute.name, attribute.value]);
      }
    }
    return Object.fromEntries(attributes);
  }

  private resolveId(element: XmlElement, kind: string, allocator: IdAllocator, warnings: string[]): string {
    const raw = element.getAttribute('id');
    if (raw !== null && raw.length > 0) {
      return raw;
    }
    const assigned = allocator.allocate(kind);
    warnings.push(`warning: assigned id ${assigned} to unnamed <${kind}>`);
    return assigned;
  }

  private applyStyle(shape: Shape, element: XmlElement): void {
    for (const name of STYLE_ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (value !== null && value.length > 0) {
        shape.setAttribute(name, value);
      }
    }
  }

  private dimension(element: XmlElement, name: 'width' | 'height'): number | undefined {
    const raw = element.getAttribute(name);
    if (raw === null || raw.length === 0) {
      return undefined;
    }
    return parseNumber(raw, name);
  }

  private viewBoxDimension(element: XmlElement, index: 0 | 1): number | undefined {
    const raw = element.getAttribute('viewBox');
    if (raw === null) {
      return undefined;
    }
    const parts = raw.trim().split(/[\s,]+/);
    const value = parts[index + 2];
    return value === undefined ? undefined : parseNumber(value, 'viewBox');
  }

  private childElements(element: XmlElement): XmlElement[] {
    const result: XmlElement[] = [];
    const nodes = element.childNodes;
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes.item(index);
      if (node !== null && node.nodeType === 1) {
        result.push(node as XmlElement);
      }
    }
    return result;
  }
}
