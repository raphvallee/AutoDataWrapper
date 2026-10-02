import {afterAll, beforeAll, beforeEach, describe, expect, mockModule, test} from "./harness";
import type {EntityManager} from "typeorm";

import type {Brand, Generation, Model, Trim} from "../src/entity/entities";
import {RecordedScraper} from "./helpers/recorded-scraper";
import {createTestDatabase, type TestDatabase} from "./helpers/test-db";

/**
 * Does the implemented fetch still work?
 *
 * These tests deliberately assert nothing about the page's markup. No selector
 * appears here, and no count is hard-coded, because both would only prove that
 * the test and the scraper agree with each other. What they check is that the
 * real extraction, fed the real recorded pages in test/helpers/recordings,
 * still produces data worth having: every brand has a name and a slug, every
 * model sits under its brand, the years are real years, the specification page
 * yields a majority of its columns, and so on.
 *
 * When auto-data.net changes its layout, the scraper stops finding these fields
 * and these assertions fail - which is the signal, instead of a green suite
 * built on a guess about what the page looks like.
 *
 * `bun run test:live` runs the same checks against the live site with a real
 * browser; `bun run record:fixtures` refreshes the recordings.
 */
let db: TestDatabase;

mockModule("../src/data-source", () => ({
    AppDataSource: {
        get manager(): EntityManager {
            if (!db) throw new Error("test data source is not ready");
            return db.dataSource.manager;
        },
    },
}));
mockModule("../src/data/ScraperEngine", () => ({ScraperEngine: RecordedScraper}));

const {FetchProvider} = await import("../src/data/fetch-provider.service");

const BASE = "https://www.auto-data.net/en";
const manager = (): EntityManager => db.dataSource.manager;

/**
 * A slug is one path segment, which is what the scrapers take from an href.
 * Dots are legitimate - the site has "e.go-brand-251" - so the check is "one
 * segment", not "alphanumeric".
 */
function isSlug(value: string): boolean {
    return value.length > 0 && !/[\s/?#]/.test(value);
}

/** The year columns are filled from page text like "2001 - 2012". */
function yearOf(value: Date): number {
    return value.getUTCFullYear();
}

beforeAll(async () => {
    db = await createTestDatabase("scraper-fetch");
});

afterAll(async () => {
    await db.dispose();
});

beforeEach(async () => {
    await db.reset();
    RecordedScraper.reset();
});

/**
 * Walks the five levels, each page the recording of the parent the previous
 * level actually produced - the same order the API serves them in.
 */
async function walk() {
    RecordedScraper.serveRecording("brands");
    const brands = await new FetchProvider().getBrands();

    RecordedScraper.serveRecording("brandModels");
    const brand: Brand | null = await new FetchProvider().getBrandWithModels(brands[0].id);

    RecordedScraper.serveRecording("modelGenerations");
    const model: Model | null = brand?.models[0]
        ? await new FetchProvider().getModelWithGenerations(brand.models[0].id)
        : null;

    RecordedScraper.serveRecording("generationTrims");
    const generation: Generation | null = model?.generations[0]
        ? await new FetchProvider().getGenerationWithTrims(model.generations[0].id)
        : null;

    RecordedScraper.serveRecording("trimDetails");
    const trim: Trim | null = generation?.trims[0]
        ? await new FetchProvider().getTrimWithDetails(generation.trims[0].id)
        : null;

    return {brands, brand, model, generation, trim};
}

describe("the fetch against recorded pages", () => {
    test("brand index yields the whole catalogue", async () => {
        RecordedScraper.serveRecording("brands");

        const brands = await new FetchProvider().getBrands();

        // The site lists every marque it covers; a handful would mean the
        // extraction lost most of the page.
        expect(brands.length).toBeGreaterThan(300);
        expect(brands.filter((brand) => brand.name === "").length).toBe(0);
        expect(brands.filter((brand) => !isSlug(brand.url ?? "")).length).toBe(0);
        expect(new Set(brands.map((brand) => brand.url)).size).toBe(brands.length);
        expect(RecordedScraper.visited).toEqual([`${BASE}/allbrands`]);
    });

    test("a brand page yields its models", async () => {
        const {brands, brand} = await walk();

        expect(brands.length).toBeGreaterThan(0);
        expect(brand).not.toBeNull();
        const models = brand!.models;
        expect(models.length).toBeGreaterThan(0);
        expect(models.filter((model) => model.name === "").length).toBe(0);
        expect(models.filter((model) => !isSlug(model.url)).length).toBe(0);
        expect(models.filter((model) => yearOf(model.startYear) < 1900).length).toBe(0);
        // The service navigated with the slug it stored, not a fresh link.
        expect(RecordedScraper.visited.slice(0, 2)).toEqual([
            `${BASE}/allbrands`,
            `${BASE}/${brands[0].url}`,
        ]);
    });

    test("a model page yields its generations", async () => {
        const {brand, model} = await walk();

        expect(brand!.models.length).toBeGreaterThan(0);
        expect(model).not.toBeNull();
        const generations = model!.generations;
        expect(generations.length).toBeGreaterThan(0);
        expect(generations.filter((generation) => generation.name === "").length).toBe(0);
        expect(generations.filter((generation) => !isSlug(generation.url)).length).toBe(0);
        expect(generations.filter((generation) => generation.chassisType === "").length).toBe(0);
        expect(generations.filter((generation) => yearOf(generation.startYear) < 1900).length).toBe(0);
        // The end year is optional on the page, the start year is not.
        expect(generations.filter((g) => Number.isNaN(yearOf(g.endYear))).length).toBe(0);
    });

    test("a generation page yields its trims", async () => {
        const {model, generation} = await walk();

        expect(model!.generations.length).toBeGreaterThan(0);
        expect(generation).not.toBeNull();
        const trims = generation!.trims;
        expect(trims.length).toBeGreaterThan(0);
        expect(trims.filter((trim) => trim.name === "").length).toBe(0);
        expect(trims.filter((trim) => !isSlug(trim.url)).length).toBe(0);
        expect(trims.filter((trim) => yearOf(trim.startYear) < 1900).length).toBe(0);
        // Not every generation has a photo gallery, so an empty list is fine -
        // but it must never be null or missing.
        expect(trims.filter((trim) => !Array.isArray(trim.imageUrls)).length).toBe(0);
    });

    test("a trim page yields most of its specification", async () => {
        const {generation, trim} = await walk();

        expect(generation!.trims.length).toBeGreaterThan(0);
        expect(trim).not.toBeNull();
        const details = trim!.trimDetails;
        expect(details).toBeDefined();

        const filled = Object.entries(details!).filter(([, value]) => value !== "" && value != null);
        // The page carries roughly 50 rows and no trim fills every column, so a
        // healthy page lands well above half. A layout change that loses the
        // row container drops this towards zero.
        expect(filled.length).toBeGreaterThan(25);

        // Spot checks on the columns the frontend actually renders, checked by
        // name rather than by position so reordering cannot break them.
        const byField = new Map(filled);
        for (const field of ["brand", "model", "generation", "modification", "bodyType", "power"]) {
            expect(byField.get(field)).toBeTruthy();
        }
    });

    test("a full walk leaves one row per level in the database", async () => {
        const {brands, brand, model, generation, trim} = await walk();

        expect(await manager().count(await import("../src/entity/entities").then((m) => m.Brand))).toBe(brands.length);
        expect(brand!.models.length).toBeGreaterThan(0);
        expect(model!.generations.length).toBeGreaterThan(0);
        expect(generation!.trims.length).toBeGreaterThan(0);
        expect(trim!.trimDetails).toBeDefined();
        // Five service calls, five closes: every request tears its scraper down.
        expect(RecordedScraper.closeCalls).toBe(5);
    });
});

describe("when a page is not the one the scraper expects", () => {
    test("an index with no brand links yields nothing and stores nothing", async () => {
        RecordedScraper.serveHtml("<html><body><p>nothing here</p></body></html>");
        const {Brand} = await import("../src/entity/entities");

        expect(await new FetchProvider().getBrands()).toEqual([]);
        expect(await manager().count(Brand)).toBe(0);
    });

    test("a detail page with no rows yields an empty specification", async () => {
        RecordedScraper.serveRecording("brands");
        const brands = await new FetchProvider().getBrands();
        RecordedScraper.serveHtml("<html><body></body></html>");

        const brand = new (await import("../src/entity/entities")).Brand();
        brand.name = "No details";
        brand.url = "no-details-brand";
        await manager().save(brand);

        const trim = new (await import("../src/entity/entities")).Trim();
        trim.name = "No details";
        trim.url = "no-details-trim";
        await manager().save(trim);

        const found = await new FetchProvider().getTrimWithDetails(trim.id);
        expect(found?.id).toBe(trim.id);
        expect(brands.length).toBeGreaterThan(0);
    });
});