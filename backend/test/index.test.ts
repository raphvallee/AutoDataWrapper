import {describe, expect, spyOn, test} from "./harness";

import type {DataSource} from "typeorm";

import {app, listens, middleware, routes} from "./helpers/fake-express";

/**
 * index.ts has no exports and binds a port on import, so it is imported once
 * for the whole file and inspected through the express recorder. The
 * initialisation failure path lives in index-init-failure.test.ts, which needs
 * a second module registry.
 */
const {AppDataSource} = await import("../src/data-source");

const initialize = spyOn(AppDataSource, "initialize").mockImplementation(
    async () => AppDataSource as unknown as DataSource
);
const logs: string[] = [];
spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
});

await import("../src/index");

describe("index", () => {
    test("initializes the data source without waiting for it", () => {
        // initialize() is called but deliberately not awaited: the server
        // accepts requests immediately and the driver connects underneath.
        expect(initialize).toHaveBeenCalledTimes(1);
    });

    test("mounts cors and the API router, and registers the root route", () => {
        expect(middleware).toHaveLength(2);
        expect(typeof middleware[0][0]).toBe("function");
        expect(middleware[1][0]).toBe("/");
        expect(routes.has("/")).toBe(true);
    });

    test("the root route greets", () => {
        const sent: unknown[] = [];
        const res = {send: (body: unknown) => void sent.push(body)};

        routes.get("/")?.({}, res);

        expect(sent).toEqual(["Welcome to Express & TypeScript Server!"]);
    });

    test("listens on port 3000 and logs the address", () => {
        expect(listens).toEqual([3000]);
        expect(logs).toContain("Server is running on http://localhost:3000");
    });
});