import {afterAll, beforeAll, describe, expect, mockModule, test} from "./harness";
import type {EntityManager} from "typeorm";

import type {Brand, Generation, Model, Trim} from "../src/entity/entities";
import {createTestDatabase, type TestDatabase} from "./helpers/test-db";

/**
 * The same invariants as scraper-fetch.test.ts, but against the live site with
 * a real browser and the real ScraperEngine. Nothing is stubbed except the
 * database, which points at a throwaway file so db.sqlite is untouched.
 *
 *   bun run test:live
 *
 * Network and Chromium, so it is opt-in and CI does not run it. Its job is to
 * answer "does the scraper still work today?" - if the site changed its layout,
 * these fail, and the recordings in scraper-fetch.test.ts are then stale until
 * `bun run record:fixtures` is re-run.
 */
const live = process.env.LIVE_SCRAPER === "1";
const TIMEOUT = 240000;

let db: TestDatabase;

mockModule("../src/data-source", () => ({
    AppDataSource: {
        get manager(): EntityManager {
            if (!db) throw new Error("test data source is not ready");
            return db.dataSource.manager;
        },
    },
}));

// Deliberately no mock for ScraperEngine: this is the point of the file.

const {FetchProvider} = await import("../src/data/fetch-provider.service");

function isSlug(value: string): boolean {
    return value.length > 0 && !/[\s/?#]/.test(value);
}

/**
 * An image the frontend can actually fetch.
 *
 * The live page hands back root-relative srcs. Storing one verbatim produces a
 * URL that only resolves next to auto-data.net, so the frontend - served from
 * localhost - renders a broken image. Every stored image URL has to be absolute.
 */
function isFetchableImageUrl(value: string | undefined): boolean {
    return typeof value === "string" && value.startsWith("https://www.auto-data.net/");
}

function yearOf(value: Date): number {
    return value.getUTCFullYear();
}

beforeAll(async () => {
    db = await createTestDatabase("scraper-live");
}, TIMEOUT);

afterAll(async () => {
    await db?.dispose();
});

describe.skipIf(!live)("the fetch against the live site", () => {
    test(
        "walking brands -> models -> generations -> trims -> details still works",
        async () => {
            const brands = await new FetchProvider().getBrands();
            expect(brands.length).toBeGreaterThan(300);
            expect(brands.filter((brand) => brand.name === "").length).toBe(0);
            expect(brands.filter((brand) => !isSlug(brand.url ?? "")).length).toBe(0);
            // /browse shows a logo for every marque, so all 398 of these URLs
            // have to be absolute and every one of them has to resolve.
            expect(brands.filter((brand) => !isFetchableImageUrl(brand.imageUrl)).length).toBe(0);

            const brand: Brand | null = await new FetchProvider().getBrandWithModels(brands[0].id);
            expect(brand?.models.length ?? 0).toBeGreaterThan(0);
            expect(brand!.models.filter((model) => !isSlug(model.url)).length).toBe(0);
            expect(
                brand!.models.filter((model) => model.imageUrl && !isFetchableImageUrl(model.imageUrl)).length
            ).toBe(0);
            expect(brand!.models.filter((model) => yearOf(model.startYear) < 1900).length).toBe(0);

            const model: Model | null = await new FetchProvider().getModelWithGenerations(
                brand!.models[0].id
            );
            expect(model?.generations.length ?? 0).toBeGreaterThan(0);
            expect(model!.generations.filter((g) => !isSlug(g.url)).length).toBe(0);
            expect(model!.generations.filter((g) => g.chassisType === "").length).toBe(0);
            expect(
                model!.generations.filter((g) => g.imageUrl && !isFetchableImageUrl(g.imageUrl)).length
            ).toBe(0);

            const generation: Generation | null = await new FetchProvider().getGenerationWithTrims(
                model!.generations[0].id
            );
            expect(generation?.trims.length ?? 0).toBeGreaterThan(0);
            expect(generation!.trims.filter((trim) => trim.name === "").length).toBe(0);
            expect(generation!.trims.filter((trim) => !isSlug(trim.url)).length).toBe(0);
            expect(
                generation!.trims.flatMap((trim) => trim.imageUrls).filter((src) => !isFetchableImageUrl(src))
                    .length
            ).toBe(0);

            const trim: Trim | null = await new FetchProvider().getTrimWithDetails(
                generation!.trims[0].id
            );
            expect(trim?.trimDetails).toBeDefined();
            const filled = Object.entries(trim!.trimDetails!).filter(
                ([, value]) => value !== "" && value != null
            );
            expect(filled.length).toBeGreaterThan(25);
            const byField = new Map(filled);
            for (const field of ["brand", "model", "generation", "modification", "bodyType", "power"]) {
                expect(byField.get(field)).toBeTruthy();
            }
        },
        TIMEOUT
    );
}, TIMEOUT);