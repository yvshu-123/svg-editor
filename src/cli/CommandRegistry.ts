import type { Command } from '../command/Command.js';
import type { CommandPlugin } from '../kernel/CommandPlugin.js';
import type { Registry } from '../kernel/Registry.js';
import { AppError } from '../shared/AppError.js';

/** 把命令名和参数翻译成一次可执行的命令。 */
export class CommandRegistry {
  constructor(private readonly commands: Pick<Registry<CommandPlugin>, 'get'>) {}

  build(tokens: string[]): Command {
    return this.prepare(tokens).command;
  }

  prepare(tokens: string[]): { command: Command; requiresDocument: boolean; opensDocument: boolean } {
    const [name, ...args] = tokens;
    if (name === undefined) {
      throw new AppError('empty command');
    }
    const plugin = this.commands.get(name);
    if (plugin === undefined) {
      throw new AppError(`unknown command: ${name}`);
    }
    return {
      command: plugin.build(args),
      requiresDocument: plugin.requiresDocument,
      opensDocument: plugin.opensDocument === true,
    };
  }
}
