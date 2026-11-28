import type { CommandPlugin } from '../kernel/CommandPlugin.js';
import type { Registry } from '../kernel/Registry.js';

interface HelpSection {
  readonly title: string;
  readonly names: readonly string[];
}

const COMMON_HELP = [
  'history',
  '  undo                            撤销上一次编辑',
  '  redo                            重做',
  '',
  'other',
  '  quit / exit                     退出',
  '# 开头的行是注释，可以把命令序列存成脚本回放',
];

export class HelpComposer {
  constructor(
    private readonly commands: Pick<Registry<CommandPlugin>, 'get' | 'names'>,
    private readonly builtinSections: readonly HelpSection[],
  ) {}

  compose(): string[] {
    const lines: string[] = [];
    const builtinNames = new Set(this.builtinSections.flatMap((section) => section.names));
    for (const { title, names } of this.builtinSections) {
      const group = names.flatMap((name) => this.linesFor(name));
      if (group.length > 0) {
        lines.push(title, ...group, '');
      }
    }
    lines.push(...COMMON_HELP);
    const extra = this.commands.names()
      .filter((name) => !builtinNames.has(name))
      .flatMap((name) => this.linesFor(name));
    if (extra.length > 0) {
      lines.push('', ...extra);
    }
    return lines;
  }

  private linesFor(name: string): readonly string[] {
    const command = this.commands.get(name);
    return command === undefined ? [] : helpLines(command);
  }
}

function helpLines(command: CommandPlugin): readonly string[] {
  if (typeof command.help !== 'string') {
    return command.help;
  }
  return [`  ${command.usage.padEnd(30)} ${command.help}`];
}
