import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { PluginHostContext, RegisteredNames } from '../kernel/PluginContext.js';
import { DuplicateRegistrationError, REGISTRATION_CATEGORIES } from '../kernel/Registry.js';

interface PluginConfigEntry {
  readonly module: string;
  readonly enabled?: boolean;
  readonly options?: unknown;
}

export async function loadPlugins(
  configPath: string,
  context: PluginHostContext,
  report: (message: string) => void,
): Promise<void> {
  let entries: PluginConfigEntry[];
  try {
    const config: unknown = JSON.parse(readFileSync(configPath, 'utf8'));
    if (!isRecord(config) || !Array.isArray(config.plugins) || !config.plugins.every(isConfigEntry)) {
      throw new Error('invalid plugin config');
    }
    entries = config.plugins;
  } catch {
    report('invalid plugin config');
    return;
  }

  const directory = dirname(resolve(configPath));
  for (const entry of entries) {
    if (entry.enabled !== false) {
      await loadPlugin(entry, directory, context, report);
    }
  }
}

async function loadPlugin(
  entry: PluginConfigEntry,
  directory: string,
  context: PluginHostContext,
  report: (message: string) => void,
): Promise<void> {
  let name = entry.module;
  const activation = context.beginActivation();
  try {
    const url = resolveModule(entry.module, directory);
    if (url === undefined) {
      report(`plugin not found: ${entry.module}`);
      return;
    }
    const { default: plugin } = await import(url);
    if (plugin === undefined) {
      report(`plugin has no default export: ${entry.module}`);
      return;
    }

    const manifest = findManifest(url);
    name = typeof manifest?.name === 'string' ? manifest.name : name;
    if (!isRecord(plugin) || typeof plugin.activate !== 'function') {
      throw new Error('missing activate(ctx, options)');
    }
    name = typeof plugin.name === 'string' ? plugin.name : name;
    await plugin.activate(activation.context, entry.options);

    const declared = manifest === undefined ? plugin.contributes : manifest.contributes;
    const mismatch = manifestMismatch(name, declared, activation.registeredNames());
    if (mismatch !== undefined) {
      report(mismatch);
      return;
    }
    activation.commit();
  } catch (error) {
    report(error instanceof DuplicateRegistrationError
      ? error.message
      : `plugin failed to activate: ${name} (${error instanceof Error ? error.message : String(error)})`);
  } finally {
    activation.rollback();
  }
}

function resolveModule(module: string, directory: string): string | undefined {
  try {
    const url = module.startsWith('.') || isAbsolute(module)
      ? pathToFileURL(resolve(directory, module)).href
      : import.meta.resolve(module);
    return url.startsWith('file:') && !existsSync(fileURLToPath(url)) ? undefined : url;
  } catch (error) {
    if (isRecord(error) && error.code === 'ERR_MODULE_NOT_FOUND') {
      return undefined;
    }
    throw error;
  }
}

function findManifest(url: string): Record<string, unknown> | undefined {
  if (!url.startsWith('file:')) {
    return undefined;
  }
  let directory = dirname(fileURLToPath(url));
  while (true) {
    const path = join(directory, 'package.json');
    if (existsSync(path)) {
      const manifest: unknown = JSON.parse(readFileSync(path, 'utf8'));
      return isRecord(manifest) && manifest.contributes !== undefined ? manifest : undefined;
    }
    const parent = dirname(directory);
    if (parent === directory) {
      return undefined;
    }
    directory = parent;
  }
}

function manifestMismatch(name: string, contributes: unknown, registered: RegisteredNames): string | undefined {
  if (contributes !== undefined && !isRecord(contributes)) {
    return `plugin manifest mismatch: ${name} (declared: invalid contributes, registered: )`;
  }
  for (const category of REGISTRATION_CATEGORIES) {
    const entry = contributes?.[category];
    const raw = entry === undefined ? [] : entry;
    const actual = [...registered[category]].sort();
    if (!Array.isArray(raw) || !raw.every((item) => typeof item === 'string')) {
      return `plugin manifest mismatch: ${name} (declared: invalid ${category}, registered: ${actual.join(', ')})`;
    }
    const declared = [...new Set<string>(raw)].sort();
    if (declared.length !== actual.length || declared.some((item, index) => item !== actual[index])) {
      return `plugin manifest mismatch: ${name} (declared: ${declared.join(', ')}, registered: ${actual.join(', ')})`;
    }
  }
  return undefined;
}

function isConfigEntry(value: unknown): value is PluginConfigEntry {
  return isRecord(value)
    && typeof value.module === 'string' && value.module.length > 0
    && (value.enabled === undefined || typeof value.enabled === 'boolean');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
