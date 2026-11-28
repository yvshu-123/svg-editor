import { TreeCommand } from '../command/commands/TreeCommand.js';
import type { CommandPlugin } from '../kernel/CommandPlugin.js';
import type { TreeRenderer } from '../ports/Ports.js';
import { AppError } from '../shared/AppError.js';

export function treePlugin(render: TreeRenderer): CommandPlugin {
  return {
    name: 'tree',
    usage: 'tree [id]',
    help: '  tree [id]                       结构树',
    requiresDocument: true,
    build(args) {
      if (args.length > 1) {
        throw new AppError(`usage: ${this.usage}`);
      }
      return new TreeCommand(render, args[0]);
    },
  };
}
