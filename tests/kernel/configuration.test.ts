import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { loadPlugins } from '../../src/host/PluginLoader.js';
import { createCliSession } from '../support/cli.js';

it('配置从自身目录按顺序装配，错误插件回滚后仍能加载下一项', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-editor-config-'));
  try {
    const packageDir = join(directory, 'fixture');
    mkdirSync(packageDir);
    writeFileSync(join(packageDir, 'package.json'), JSON.stringify({
      name: 'configured', contributes: { commands: ['configured'] },
    }));
    writeFileSync(join(packageDir, 'index.mjs'), `
      export default {
        activate(ctx, options) {
          ctx.commands.register('configured', {
            name: 'configured', usage: 'configured', help: 'from config', requiresDocument: false,
            build: () => ({ kind: 'display', execute: () => ({ lines: [options.message] }) })
          });
        }
      };
    `);
    writeFileSync(join(directory, 'duplicate.mjs'), `
      export default {
        activate(ctx) {
          ctx.commands.register('unpublished', {});
          ctx.commands.register('help', {});
        }
      };
    `);
    writeFileSync(join(directory, 'mismatch.mjs'), `
      export default { name: 'mismatch', contributes: { shapes: ['extra'] }, activate() {} };
    `);
    writeFileSync(join(directory, 'no-default.mjs'), 'export const ignored = true;');
    writeFileSync(join(directory, 'bad-dependency.mjs'), "import './missing-dependency.mjs';");
    writeFileSync(join(directory, 'throws.mjs'), `
      export default {
        name: 'throws',
        activate(ctx) {
          ctx.commands.register('unpublished', {});
          throw new Error('boom');
        }
      };
    `);
    const config = join(directory, 'extension.json');
    writeFileSync(config, JSON.stringify({
      plugins: [
        { module: './disabled.mjs', enabled: false },
        { module: './missing.mjs' },
        { module: './no-default.mjs' },
        { module: './duplicate.mjs' },
        { module: './mismatch.mjs' },
        { module: './bad-dependency.mjs' },
        { module: './throws.mjs' },
        { module: './fixture/index.mjs', options: { message: 'hello from configuration' } },
      ],
    }));

    const errors: string[] = [];
    const { context, repl } = createCliSession();
    await loadPlugins(config, context, (message) => errors.push(message));
    expect(errors).toEqual([
      'plugin not found: ./missing.mjs',
      'plugin has no default export: ./no-default.mjs',
      'duplicate registration: commands/help',
      'plugin manifest mismatch: mismatch (declared: extra, registered: )',
      expect.stringMatching(/^plugin failed to activate: \.\/bad-dependency\.mjs \(/),
      'plugin failed to activate: throws (boom)',
    ]);
    expect(repl.handleLine('configured')).toEqual(['hello from configuration']);
    expect(repl.handleLine('help').at(-1)).toContain('from config');
    expect(repl.handleLine('unpublished')).toEqual(['error: unknown command: unpublished']);

    writeFileSync(config, '{ malformed }');
    await loadPlugins(config, context, (message) => errors.push(message));
    expect(errors.at(-1)).toBe('invalid plugin config');
    expect(repl.handleLine('configured')).toEqual(['hello from configuration']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
