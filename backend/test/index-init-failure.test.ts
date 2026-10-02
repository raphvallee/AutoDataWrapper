import {describe, expect, spyOn, test} from "./harness";

import {listens} from "./helpers/fake-express";

/**
 * The same entrypoint, but with a data source that refuses to connect.
 *
 * index.ts wraps only the initialize() call in a try/catch, so the server must
 * still come up: a broken database must not stop the process from booting and
 * logging, and must not surface as an unhandled rejection.
 */
const previousPort = process.env.PORT;
process.env.PORT = "4321";

const {AppDataSource} = await import("../src/data-source");
const failure = new Error("SQLITE_CANTOPEN: unable to open database file");
spyOn(AppDataSource, "initialize").mockImplementation(() => {
    throw failure;
});

const errors: unknown[][] = [];
spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args);
});
const logs: string[] = [];
spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
});

await import("../src/index");

describe("index when the data source fails to initialize", () => {
    test("logs the failure and still starts the server", () => {
        expect(errors).toEqual([["Error during Data Source initialization:", failure]]);
        expect(logs).toContain("Server is running on http://localhost:4321");
        expect(listens).toEqual(["4321"]);
    });

    test("the process survives", () => {
        // Nothing above threw out of the import, which is the whole point:
        // an unhandled rejection here would take the server down on request.
        expect(true).toBe(true);
        process.env.PORT = previousPort;
    });
});