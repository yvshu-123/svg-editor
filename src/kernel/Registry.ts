import { AppError } from '../shared/AppError.js';

export type RegistrationCategory = 'shapes' | 'commands' | 'decorators' | 'attributes';

export interface Registration<T> {
  register(name: string, contribution: T): void;
}

/** 同一个类别内按注册顺序读取贡献。 */
export class Registry<T> implements Registration<T> {
  private readonly entries = new Map<string, T>();

  constructor(private readonly category: RegistrationCategory) {}

  register(name: string, contribution: T): void {
    if (this.entries.has(name)) {
      throw new AppError(`duplicate registration: ${this.category}/${name}`);
    }
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
}
