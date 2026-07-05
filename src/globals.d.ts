// Minimal ambient types for bun's test runner: the project intentionally does
// not depend on @types/bun, so the *.test.ts files declare just what they use.
declare module 'bun:test' {
  type TestHandler = () => void | Promise<void>;
  type ExpectAssertions = {
    toBe(expected: unknown): void;
    toBeGreaterThan(expected: number): void;
    toBeInstanceOf(expected: unknown): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toContain(expected: unknown): void;
    toEqual(expected: unknown): void;
    toHaveBeenCalledWith(...args: unknown[]): void;
    toHaveBeenCalled(): void;
    toHaveBeenCalledTimes(expected: number): void;
    toHaveLength(expected: number): void;
    toThrow(expected?: unknown): void;
  };
  type ExpectMatchers = ExpectAssertions & {
    not: ExpectAssertions;
    rejects: ExpectAssertions;
    resolves: ExpectAssertions;
  };

  export function describe(name: string, fn: TestHandler): void;
  export function it(name: string, fn: TestHandler): void;
  export function test(name: string, fn: TestHandler): void;
  export function expect<T>(actual: T): ExpectMatchers;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function setSystemTime(time: Date | number | null): void;
  export const mock: {
    module(path: string, factory: () => any): void;
    restore(): void;
    <T extends (...args: any[]) => any>(
      fn?: T,
    ): T & { mockClear(): void; mockImplementationOnce(fn: T): void };
  };
}
