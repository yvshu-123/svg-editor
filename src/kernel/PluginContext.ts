import type { CommandPlugin } from './CommandPlugin.js';
import { Registry } from './Registry.js';

export function createPluginContext() {
  return { commands: new Registry<CommandPlugin>('commands') };
}
