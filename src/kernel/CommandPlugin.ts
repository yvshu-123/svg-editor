import type { Command } from '../command/Command.js';

export interface CommandPlugin {
  readonly name: string;
  readonly usage: string;
  /** 完整帮助行，包含显示时需要的缩进和空格。 */
  readonly help: string | readonly string[];
  readonly requiresDocument: boolean;
  readonly opensDocument?: boolean;
  build(args: string[]): Command;
}
