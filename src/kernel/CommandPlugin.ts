import type { Command } from '../command/Command.js';

export interface CommandPlugin {
  readonly name: string;
  readonly usage: string;
  /** 简介，或已经排版的多行帮助。 */
  readonly help: string | readonly string[];
  readonly requiresDocument: boolean;
  readonly opensDocument?: boolean;
  build(args: string[]): Command;
}
