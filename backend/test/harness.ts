import type * as Vitest from "vitest";

/**
 * One test API, two runners.
 *
 * The suite runs under `bun test` (native, what CI uses) and under vitest
 * (one runner for the whole monorepo). The two disagree on exactly three
 * things - the import specifier, mock functions, and module mocking - so those
 * are adapted here and everything else is passed straight through.
 *
 * Only the runner that is actually in use gets imported. Importing vitest from
 * a bun test process (or `bun:test` from a vitest worker) throws, so the
 * branch is not optional.
 *
 * Module mocking maps onto `vi.doMock` rather than `vi.mock`: `vi.mock` is
 * hoisted above the imports, which would break the tests that import their
 * subject *after* registering a mock. `doMock` is a plain runtime call, so the
 * `mockModule(...)` then `await import(...)` sequence behaves as it does in bun.
 */

// The import on line 1 is type-only, so it is erased at runtime and costs
// nothing under bun test. Everything below is what needs adapting.
type Procedure = (...args: never[]) => unknown;
type Mock<T extends Procedure = Procedure> = Vitest.Mock<T>;

const runningUnderVitest =
    process.env.VITEST !== undefined ||
    typeof (globalThis as {__vitest_worker__?: unknown}).__vitest_worker__ !== "undefined";

const runningUnderBunTest =
    !runningUnderVitest && typeof (globalThis as {Bun?: unknown}).Bun !== "undefined";

if (!runningUnderVitest && !runningUnderBunTest) {
    throw new Error("test/harness.ts cannot tell which runner this is. Expected bun test or vitest.");
}

const api: Record<string, unknown> = runningUnderVitest
    ? await import("vitest")
    : await import("bun:test");
const vi = runningUnderVitest
    ? (api.vi as Record<string, unknown>)
    : {fn: api.mock, spyOn: api.spyOn, doMock: (api.mock as {module: unknown}).module};

function required<T>(name: string): T {
    const value = api[name];
    if (value === undefined) throw new Error(`the runner does not export ${name}`);
    return value as T;
}

export const test: typeof Vitest.test = required("test");
export const describe: typeof Vitest.describe = required("describe");
export const expect: typeof Vitest.expect = required("expect");
export const beforeAll: typeof Vitest.beforeAll = required("beforeAll");
export const beforeEach: typeof Vitest.beforeEach = required("beforeEach");
export const afterEach: typeof Vitest.afterEach = required("afterEach");
export const afterAll: typeof Vitest.afterAll = required("afterAll");

/** A mock function: bun's `mock`, vitest's `vi.fn`. */
export const fn: <T extends Procedure>(implementation?: T) => Mock<T> = vi.fn as <T extends Procedure>(
    implementation?: T
) => Mock<T>;

/** Replaces a method with a spy: bun's `spyOn`, vitest's `vi.spyOn`. */
export const spyOn: <T extends object, K extends keyof T>(object: T, method: K) => Mock =
    vi.spyOn as <T extends object, K extends keyof T>(object: T, method: K) => Mock;

/**
 * Registers a module mock for the imports that follow.
 * Bun's `mock.module`, vitest's `vi.doMock`.
 */
export const mockModule: (specifier: string, factory: () => unknown) => void = vi.doMock as (
    specifier: string,
    factory: () => unknown
) => void;