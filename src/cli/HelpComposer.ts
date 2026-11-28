import type { CommandPlugin } from '../kernel/CommandPlugin.js';
import type { Registry } from '../kernel/Registry.js';

const SECTIONS = ['document', 'shapes', 'view'] as const;
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
  constructor(private readonly commands: Pick<Registry<CommandPlugin>, 'values'>) {}

  compose(): string[] {
    const commands = this.commands.values();
    const lines: string[] = [];
    for (const section of SECTIONS) {
      const group = commands.filter((command) => command.helpSection === section);
      if (group.length > 0) {
        lines.push(section, ...group.flatMap(helpLines), '');
      }
    }
    lines.push(...COMMON_HELP);
    const extra = commands.filter((command) => command.helpSection === undefined).flatMap(helpLines);
    if (extra.length > 0) {
      lines.push('', ...extra);
    }
    return lines;
  }
}

function helpLines(command: CommandPlugin): readonly string[] {
  if (typeof command.help !== 'string') {
    return command.help;
  }
  return [`  ${command.usage.padEnd(30)} ${command.help}`];
}
