import { AppError } from '../shared/AppError.js';

export type RegistrationCategory = 'shapes' | 'commands' | 'decorators' | 'attributes';

export interface Registration<T> {
  register(name: string, contribution: T): void;
}

export class DuplicateRegistrationError extends AppError {
  constructor(category: RegistrationCategory, name: string) {
    super(`duplicate registration: ${category}/${name}`);
  }
}

/** 同一个类别内按注册顺序读取贡献。 */
export class Registry<T> implements Registration<T> {
  private readonly entries = new Map<string, T>();

  constructor(private readonly category: RegistrationCategory) {}

  register(name: string, contribution: T): void {
    this.requireAvailable(name);
    this.entries.set(name, contribution);
  }

  get(name: string): T | undefined {
    return this.entries.get(name);
  }

  names(): string[] {
    return [...this.entries.keys()];
  }

  values(): T[] {
    return [...this.entries.values()];
  }

  stage(requireOpen: () => void) {
    const pending = new Registry<T>(this.category);
    return {
      register: (name: string, contribution: T) => {
        requireOpen();
        this.requireAvailable(name);
        pending.register(name, contribution);
      },
      names: () => pending.names(),
      validate: () => {
        for (const name of pending.entries.keys()) {
          this.requireAvailable(name);
        }
      },
      publish: () => {
        for (const [name, contribution] of pending.entries) {
          this.entries.set(name, contribution);
        }
      },
      discard: () => pending.entries.clear(),
    };
  }

  private requireAvailable(name: string): void {
    if (this.entries.has(name)) {
      throw new DuplicateRegistrationError(this.category, name);
    }
  }
}
