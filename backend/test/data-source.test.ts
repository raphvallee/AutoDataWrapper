import path from "path";
import {describe, expect, test} from "./harness";

import {AppDataSource} from "../src/data-source";
import {Brand, Generation, Model, Trim, TrimDetails} from "../src/entity/entities";

/**
 * data-source.ts runs for its side effects on import: it asserts the Bun
 * version and builds the data source. These tests read the resulting options.
 *
 * AppDataSource is deliberately never initialized here - it points at
 * db.sqlite and `synchronize: true` would rebuild the development schema under
 * the running server. test-db.ts covers the driver against a throwaway file.
 */
describe("AppDataSource", () => {
    test("is configured for better-sqlite3 with synchronise on", () => {
        expect(AppDataSource.options.type).toBe("better-sqlite3");
        expect(AppDataSource.options.synchronize).toBe(true);
        expect(AppDataSource.options.logging).toBe(false);
    });

    test("resolves the database to an absolute path", () => {
        const database = AppDataSource.options.database as string;
        expect(path.isAbsolute(database)).toBe(true);
        expect(database).toBe(path.resolve("db.sqlite"));
        // BetterSqlite3Driver mkdirs the parent directory first, and Bun
        // rejects the degenerate "." that a bare filename produces.
        expect(database.endsWith("db.sqlite")).toBe(true);
    });

    test("registers the entity classes explicitly, not as a glob", () => {
        expect(AppDataSource.options.entities).toEqual([
            Brand,
            Model,
            Generation,
            Trim,
            TrimDetails,
        ]);
    });

    test("starts out uninitialized", () => {
        expect(AppDataSource.isInitialized).toBe(false);
    });
});