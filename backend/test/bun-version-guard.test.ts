import {describe, expect, test} from "./harness";

import {assertBunCanLoadBetterSqlite3} from "../src/bun-version-guard";

describe("assertBunCanLoadBetterSqlite3", () => {
    test("lets the real Bun version through", () => {
        // The default argument reads globalThis.Bun.version, so calling with no
        // argument is the assertion data-source.ts performs on import.
        expect(() => assertBunCanLoadBetterSqlite3()).not.toThrow();
    });

    test("allows Node, where the addon loads through Node's own N-API", () => {
        expect(() => assertBunCanLoadBetterSqlite3(undefined)).not.toThrow();
    });

    test.each([
        "1.4.1", // exactly the fixed version
        "1.4.2",
        "1.5.0", // newer minor
        "2.0.0", // newer major
        // A prerelease suffix makes the patch component NaN, and every
        // comparison against NaN is false, so the guard waves it through.
        // Documented as-is: 1.4.1-rc.1 is older than 1.4.1, so this is a hole
        // in the guard, not a behaviour to rely on.
        "1.4.1-rc.1",
    ])("allows bun %s", (version) => {
        expect(() => assertBunCanLoadBetterSqlite3(version)).not.toThrow();
    });

    test.each([
        ["1.3.14", "the version .bun/bin/bun.exe still reports"],
        ["1.4.0", "the version the bug was fixed in"],
        ["1.4", "a missing patch component counts as 0, so it is older than 1.4.1"],
        ["1.3", "older minor"],
        ["0.9.9", "older major"],
    ])("rejects bun %s (%s)", (version) => {
        expect(() => assertBunCanLoadBetterSqlite3(version)).toThrow(
            /cannot load better-sqlite3/
        );
    });

    test("names the version, the fix and the minimum in the error", () => {
        expect(() => assertBunCanLoadBetterSqlite3("1.3.14")).toThrow(
            "Bun 1.3.14 cannot load better-sqlite3 and exits silently. " +
                "Run `bun upgrade` (needs >= 1.4.1), or run this backend on Node instead."
        );
    });
});