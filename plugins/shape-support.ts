import type { PluginContext } from '../src/kernel/PluginContext.js';
import type { ShapeProvider } from '../src/kernel/ShapeProvider.js';
import { AppError } from '../src/shared/AppError.js';
import { parseNumber } from '../src/shared/NumberFormat.js';

export function defineShapePlugin(provider: ShapeProvider) {
  return {
    contributes: { shapes: [provider.kind] },
    activate(context: Pick<PluginContext, 'shapes'>): void {
      context.shapes.register(provider.kind, provider);
    },
  };
}

export function expectCount(params: string[], min: number, max: number, usage: string): void {
  if (params.length < min || params.length > max) {
    throw new AppError(`usage: ${usage}`);
  }
}

export function numberAt(params: string[], index: number, name: string): number {
  return parseNumber(params[index] ?? '', name);
}
