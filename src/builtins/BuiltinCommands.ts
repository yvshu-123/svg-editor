import type { Command } from '../command/Command.js';
import { AddToCommand } from '../command/commands/AddToCommand.js';
import { CanvasCommand } from '../command/commands/CanvasCommand.js';
import { CreateShapeCommand } from '../command/commands/CreateShapeCommand.js';
import { DeleteShapeCommand } from '../command/commands/DeleteShapeCommand.js';
import { GroupCommand } from '../command/commands/GroupCommand.js';
import { HelpCommand } from '../command/commands/HelpCommand.js';
import { InitCommand } from '../command/commands/InitCommand.js';
import { MoveCommand } from '../command/commands/MoveCommand.js';
import { ReadCommand } from '../command/commands/ReadCommand.js';
import { ReorderCommand } from '../command/commands/ReorderCommand.js';
import { SaveCommand } from '../command/commands/SaveCommand.js';
import { ScaleCommand } from '../command/commands/ScaleCommand.js';
import { SetAttributeCommand } from '../command/commands/SetAttributeCommand.js';
import { ShowCommand } from '../command/commands/ShowCommand.js';
import { TreeCommand } from '../command/commands/TreeCommand.js';
import { UngroupCommand } from '../command/commands/UngroupCommand.js';
import type { AttributeService } from '../kernel/AttributeService.js';
import type { CommandPlugin } from '../kernel/CommandPlugin.js';
import type { Registration } from '../kernel/Registry.js';
import type { ShapeRenderer, SvgReaderPort, SvgWriterPort, TreeRenderer } from '../ports/Ports.js';
import type { ShapeFactory } from '../shapes/ShapeFactory.js';
import { AppError } from '../shared/AppError.js';
import { parseNumber } from '../shared/NumberFormat.js';

export interface BuiltinCommandDependencies {
  factory: ShapeFactory;
  attributes: AttributeService;
  reader: SvgReaderPort;
  writer: SvgWriterPort;
  treeRenderer: TreeRenderer;
  shapeRenderer: ShapeRenderer;
  helpLines(): readonly string[];
}

export function activateBuiltinCommands(commands: Registration<CommandPlugin>, deps: BuiltinCommandDependencies): void {
  function register(helpSection: CommandPlugin['helpSection'], plugins: CommandPlugin[]): void {
    for (const plugin of plugins) {
      commands.register(plugin.name, { ...plugin, helpSection });
    }
  }

  register('document', [
    command('init', 'init [w] [h]', [0, 2], [
      '  init [w] [h]                    新建画布（默认 800x600）',
    ], (args) => new InitCommand(
      args[0] === undefined ? 800 : number(args[0], 'width'),
      args[1] === undefined ? 600 : number(args[1], 'height'),
    ), { requiresDocument: false, opensDocument: true }),
    command('read', 'read <file.svg>', 1, [
      '  read <file.svg>                 读入 SVG 文件',
    ], (args) => new ReadCommand(args[0]!, deps.reader), { requiresDocument: false, opensDocument: true }),
    command('save', 'save [file.svg]', [0, 1], [
      '  save [file.svg]                 保存（不带参数时用读入路径）',
    ], (args) => new SaveCommand(args[0] ?? null, deps.writer)),
    command('canvas', 'canvas [w] [h]', [0, 2], [
      '  canvas [w] [h]                  查看或修改画布尺寸',
    ], (args) => {
      if (args.length === 0) {
        return new CanvasCommand();
      }
      expectCount(args, 2, 2, 'canvas [w] [h]');
      return new CanvasCommand(number(args[0], 'width'), number(args[1], 'height'));
    }),
  ]);

  register('shapes', [
    command('create', 'create <type> <id> [params…] [in <containerId>]', [2, Infinity], [
      '  create <type> <id> [params…] [in <containerId>]',
      '        rect    <id> <x> <y> <w> <h> [fill]',
      '        circle  <id> <cx> <cy> <r> [fill]',
      '        ellipse <id> <cx> <cy> <rx> <ry> [fill]',
      '        line    <id> <x1> <y1> <x2> <y2> [stroke]',
      '        text    <id> <x> <y> "content"',
      '        g       <id>',
    ], (args) => {
      const params = args.slice(2);
      const hasContainer = params.length >= 2 && params.at(-2) === 'in';
      return new CreateShapeCommand(
        deps.factory, args[0]!, args[1]!,
        hasContainer ? params.slice(0, -2) : params,
        hasContainer ? params.at(-1) : undefined,
      );
    }),
    command('delete', 'delete <id>', 1, [
      '  delete <id>                     删除图形（容器含子孙）',
    ], (args) => new DeleteShapeCommand(args[0]!)),
    command('move', 'move <id> <dx> <dy>', 3, [
      '  move <id> <dx> <dy>             平移',
    ], (args) => new MoveCommand(args[0]!, number(args[1], 'dx'), number(args[2], 'dy'))),
    command('scale', 'scale <id> <factor>', 2, [
      '  scale <id> <factor>             等比缩放',
    ], (args) => new ScaleCommand(args[0]!, number(args[1], 'factor'))),
    command('set', 'set <id> <attr> <value>', 3, [
      '  set <id> <attr> <value>         设置属性',
    ], (args) => new SetAttributeCommand(args[0]!, args[1]!, args[2]!, deps.attributes)),
    command('group', 'group <newGid> <id1> <id2>…', [2, Infinity], [
      '  group <newGid> <id1> <id2>…     新建容器并收编图形',
    ], (args) => new GroupCommand(args[0]!, args.slice(1))),
    command('ungroup', 'ungroup <gid>', 1, [
      '  ungroup <gid>                   解散容器',
    ], (args) => new UngroupCommand(args[0]!)),
    command('addto', 'addto <gid> <id>', 2, [
      '  addto <gid> <id>                把图形移入容器',
    ], (args) => new AddToCommand(args[0]!, args[1]!)),
    command('front', 'front <id>', 1, [
      '  front <id> / back <id>          调整前后顺序',
    ], (args) => new ReorderCommand(args[0]!, 'front')),
    command('back', 'back <id>', 1, [], (args) => new ReorderCommand(args[0]!, 'back')),
  ]);

  register('view', [
    command('tree', 'tree [id]', [0, 1], [
      '  tree [id]                       结构树',
    ], (args) => new TreeCommand(deps.treeRenderer, args[0])),
    command('show', 'show <id>', 1, [
      '  show <id>                       属性明细',
    ], (args) => new ShowCommand(deps.shapeRenderer, args[0]!)),
    command('help', 'help', 0, [
      '  help                            显示本帮助',
    ], () => new HelpCommand([...deps.helpLines()]), { requiresDocument: false }),
  ]);
}

function command(
  name: string,
  usage: string,
  count: number | readonly [number, number],
  help: readonly string[],
  build: (args: string[]) => Command,
  policy: Pick<CommandPlugin, 'requiresDocument' | 'opensDocument'> = { requiresDocument: true },
): CommandPlugin {
  const [min, max] = typeof count === 'number' ? [count, count] : count;
  return {
    name,
    usage,
    help,
    ...policy,
    build(args) {
      expectCount(args, min, max, usage);
      return build(args);
    },
  };
}

function expectCount(args: string[], min: number, max: number, usage: string): void {
  if (args.length < min || args.length > max) {
    throw new AppError(`usage: ${usage}`);
  }
}

function number(token: string | undefined, label: string): number {
  return parseNumber(token ?? '', label);
}
