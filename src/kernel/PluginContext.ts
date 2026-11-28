import { Document } from '../domain/Document.js';
import { AppError } from '../shared/AppError.js';
import type { AttributeHandler } from './AttributeHandler.js';
import type { CommandPlugin } from './CommandPlugin.js';
import { Registry, type Registration, type RegistrationCategory } from './Registry.js';
import type { ShapeProvider } from './ShapeProvider.js';
import type { TreeDecorator } from './TreeDecorator.js';

export interface DocumentChangedEvent {
  readonly document: Document;
  readonly reason: 'init' | 'read' | 'save' | 'edit' | 'undo' | 'redo';
}

export type DocumentChangedListener = (event: DocumentChangedEvent) => void;
export type RegisteredNames = Record<RegistrationCategory, readonly string[]>;

export interface PluginContext {
  readonly document: Document;
  readonly shapes: Registration<ShapeProvider>;
  readonly commands: Registration<CommandPlugin>;
  readonly decorators: Registration<TreeDecorator>;
  readonly attributes: Registration<AttributeHandler>;
  on(event: 'document:changed', listener: DocumentChangedListener): () => void;
}

export interface PluginActivation {
  readonly context: PluginContext;
  registeredNames(): RegisteredNames;
  commit(): void;
  rollback(): void;
}

type NameSources = Record<RegistrationCategory, { names(): string[] }>;

function getNames(registries: NameSources): RegisteredNames {
  return {
    shapes: registries.shapes.names(),
    commands: registries.commands.names(),
    decorators: registries.decorators.names(),
    attributes: registries.attributes.names(),
  };
}

export function createPluginContext(document = new Document(), onListenerError?: (error: unknown) => void) {
  const registries = {
    shapes: new Registry<ShapeProvider>('shapes'),
    commands: new Registry<CommandPlugin>('commands'),
    decorators: new Registry<TreeDecorator>('decorators'),
    attributes: new Registry<AttributeHandler>('attributes'),
  };
  const listeners = new Set<DocumentChangedListener>();

  function on(_event: 'document:changed', listener: DocumentChangedListener): () => void {
    const subscription: DocumentChangedListener = (event) => listener(event);
    listeners.add(subscription);
    return () => { listeners.delete(subscription); };
  }

  function beginActivation(): PluginActivation {
    let open = true;
    const pendingListeners = new Set<DocumentChangedListener>();
    const stages = {
      shapes: registries.shapes.stage(requireOpen),
      commands: registries.commands.stage(requireOpen),
      decorators: registries.decorators.stage(requireOpen),
      attributes: registries.attributes.stage(requireOpen),
    };
    const categories = Object.values(stages);

    function requireOpen(): void {
      if (!open) {
        throw new AppError('registration transaction is closed');
      }
    }

    function close(): void {
      open = false;
      categories.forEach((stage) => stage.discard());
      pendingListeners.clear();
    }

    return {
      context: {
        document,
        shapes: { register: stages.shapes.register },
        commands: { register: stages.commands.register },
        decorators: { register: stages.decorators.register },
        attributes: { register: stages.attributes.register },
        on(_event, listener) {
          requireOpen();
          const subscription: DocumentChangedListener = (event) => listener(event);
          pendingListeners.add(subscription);
          return () => {
            pendingListeners.delete(subscription);
            listeners.delete(subscription);
          };
        },
      },
      registeredNames() {
        requireOpen();
        return getNames(stages);
      },
      commit() {
        requireOpen();
        categories.forEach((stage) => stage.validate());
        categories.forEach((stage) => stage.publish());
        pendingListeners.forEach((listener) => listeners.add(listener));
        close();
      },
      rollback: close,
    };
  }

  return {
    document,
    ...registries,
    on,
    beginActivation,
    registeredNames: () => getNames(registries),
    emitDocumentChanged(event: DocumentChangedEvent): void {
      for (const listener of [...listeners]) {
        try {
          listener(event);
        } catch (error) {
          onListenerError?.(error);
        }
      }
    },
  };
}

export type PluginHostContext = ReturnType<typeof createPluginContext>;
