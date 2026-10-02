import {afterAll, afterEach, beforeAll, describe, expect, mockModule, spyOn, test} from "./harness";
import express from "express";
import type {Server} from "node:http";
import type {AddressInfo} from "node:net";

import {RecordedScraper} from "./helpers/recorded-scraper";

/**
 * The route table is exercised over real HTTP with real express: status codes,
 * JSON bodies and the 500 fallback are what the frontend sees, so asserting on
 * the router's internals would test less.
 *
 * Only the service is replaced, so no database and no browser are involved.
 */
let constructions = 0;

const service = {
    getBrands: async (): Promise<unknown[]> => [],
    getBrandWithModels: async (_brandId: number): Promise<unknown> => null,
    getModelWithGenerations: async (_modelId: number): Promise<unknown> => null,
    getGenerationWithTrims: async (_generationId: number): Promise<unknown> => null,
    getTrimWithDetails: async (_trimId: number): Promise<unknown> => null,
};

const calls: {method: string; id: number}[] = [];

mockModule("../src/data/fetch-provider.service", () => ({
    FetchProvider: class {
        constructor() {
            constructions++;
        }

        getBrands() {
            calls.push({method: "getBrands", id: NaN});
            return service.getBrands();
        }

        getBrandWithModels(brandId: number) {
            calls.push({method: "getBrandWithModels", id: brandId});
            return service.getBrandWithModels(brandId);
        }

        getModelWithGenerations(modelId: number) {
            calls.push({method: "getModelWithGenerations", id: modelId});
            return service.getModelWithGenerations(modelId);
        }

        getGenerationWithTrims(generationId: number) {
            calls.push({method: "getGenerationWithTrims", id: generationId});
            return service.getGenerationWithTrims(generationId);
        }

        getTrimWithDetails(trimId: number) {
            calls.push({method: "getTrimWithDetails", id: trimId});
            return service.getTrimWithDetails(trimId);
        }
    },
}));

const {default: router} = await import("../src/routes");

let server: Server;
let origin = "";

beforeAll(async () => {
    const app = express();
    app.use(router);
    await new Promise<void>((resolve, reject) => {
        server = app.listen(0, () => resolve());
        server.once("error", reject);
    });
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

afterEach(() => {
    calls.length = 0;
});

async function get(path: string): Promise<{status: number; body: unknown}> {
    const response = await fetch(`${origin}${path}`);
    return {status: response.status, body: await response.json()};
}

describe("routes", () => {
    test("GET /brands answers with the service payload", async () => {
        service.getBrands = async () => [{id: 1, name: "BMW"}];

        expect(await get("/brands")).toEqual({
            status: 200,
            body: [{id: 1, name: "BMW"}],
        });
        expect(calls).toEqual([{method: "getBrands", id: NaN}]);
    });

    test("GET /brand/:id passes the parsed id on", async () => {
        service.getBrandWithModels = async (brandId) => ({id: brandId, models: []});

        expect(await get("/brand/7")).toEqual({status: 200, body: {id: 7, models: []}});
        expect(calls).toEqual([{method: "getBrandWithModels", id: 7}]);
    });

    test("GET /model/:id passes the parsed id on", async () => {
        service.getModelWithGenerations = async (modelId) => ({id: modelId, generations: []});

        expect(await get("/model/5")).toEqual({
            status: 200,
            body: {id: 5, generations: []},
        });
    });

    test("GET /generation/:id passes the parsed id on", async () => {
        service.getGenerationWithTrims = async (generationId) => ({id: generationId, trims: []});

        expect(await get("/generation/3")).toEqual({status: 200, body: {id: 3, trims: []}});
    });

    test("GET /trim/:id passes the parsed id on", async () => {
        service.getTrimWithDetails = async (trimId) => ({id: trimId, trimDetails: null});

        expect(await get("/trim/2")).toEqual({status: 200, body: {id: 2, trimDetails: null}});
    });

    test("a non-numeric id reaches the service as NaN", async () => {
        // parseInt returns NaN rather than 400-ing, and the service then
        // reports "not found". Pinned so a future validation change is visible.
        await get("/brand/not-a-number");
        expect(calls).toEqual([{method: "getBrandWithModels", id: NaN}]);
    });

    describe("when the service throws", () => {
        const endpoints = [
            ["/brands", "Failed to load brands", "getBrands"],
            ["/brand/1", "Failed to load brand", "getBrandWithModels"],
            ["/model/1", "Failed to load model", "getModelWithGenerations"],
            ["/generation/1", "Failed to load generation", "getGenerationWithTrims"],
            ["/trim/1", "Failed to load trim", "getTrimWithDetails"],
        ] as const;

        test.each(endpoints)("%s answers 500 instead of crashing", async (path, message, method) => {
            const errors: unknown[][] = [];
            spyOn(console, "error").mockImplementation((...args: unknown[]) => {
                errors.push(args);
            });
            service[method as keyof typeof service] = async () => {
                throw new Error("database is gone");
            };

            expect(await get(path)).toEqual({status: 500, body: {error: message}});
            expect(errors).toHaveLength(1);
            expect(errors[0][1]).toBeInstanceOf(Error);
        });
    });

    test("one provider serves every request", async () => {
        await get("/brands");
        await get("/brand/1");
        await get("/model/1");
        await get("/generation/1");
        await get("/trim/1");

        // Built lazily on the first request and reused afterwards, so the
        // scraper behind it is not recreated per call.
        expect(constructions).toBe(1);
    });

    test("no test launched a browser", () => {
        // The provider is mocked, so this also documents that the route layer
        // itself has no scraper side effects.
        expect(RecordedScraper.instances).toEqual([]);
    });
});