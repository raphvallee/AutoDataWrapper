import {afterAll, beforeAll, beforeEach, describe, expect, mockModule, spyOn, test} from "./harness";
import type {EntityManager} from "typeorm";

import {Brand, Generation, Model, Trim, TrimDetails} from "../src/entity/entities";
import {
    ASSISTING_SYSTEMS_SHAPES,
    BRANDS_WITH_GAPS,
    BRANDS_WITH_IMAGE_URL_SHAPES,
    DETAILS_WITH_GAPS,
    GENERATIONS_WITH_GAPS,
    MODELS_WITH_GAPS,
    TRIMS_WITH_GAPS,
} from "./helpers/edge-cases";
import {RecordedScraper} from "./helpers/recorded-scraper";
import {createTestDatabase, type TestDatabase} from "./helpers/test-db";

/**
 * What the service does with what the scraper gives it: store it, reuse it,
 * reload it, and survive a failure at any step.
 *
 * The pages served here are the recorded real ones (see scraper-fetch.test.ts
 * for the assertions about what the site yields). The synthetic pages from
 * helpers/edge-cases.ts are used only where a defensive branch needs a page the
 * real site does not produce.
 */
let db: TestDatabase;

mockModule("../src/data-source", () => ({
    // A proxy rather than the instance: mockModule() is hoisted above
    // beforeAll, so the data source does not exist yet when the factory runs.
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
const EMPTY_PAGE = "<html><body></body></html>";

function manager(): EntityManager {
    return db.dataSource.manager;
}

/** Every provider swallows errors into the log; keep the test output readable. */
function captureLogs() {
    const errors: unknown[] = [];
    const warns: string[] = [];
    spyOn(console, "log").mockImplementation((...args: unknown[]) => void errors.push(args[0]));
    spyOn(console, "warn").mockImplementation((...args: unknown[]) => void warns.push(String(args[0])));
    return {errors, warns};
}

async function seedBrand(name = "BMW", url = "bmw-brand-1"): Promise<Brand> {
    const brand = new Brand();
    brand.name = name;
    brand.url = url;
    brand.imageUrl = `/img/brands/${url}.png`;
    await manager().save(brand);
    return brand;
}

async function seedModel(brand: Brand | null, name = "3 Series", url = "bmw-3-series-model-5"): Promise<Model> {
    const model = new Model();
    model.name = name;
    model.url = url;
    model.startYear = new Date("2019-01-01");
    model.endYear = new Date("2026-01-01");
    model.imageUrl = `/img/models/${url}.png`;
    if (brand) model.brand = brand;
    await manager().save(model);
    return model;
}

async function seedGeneration(
    model: Model | null,
    name = "3 Series (3)",
    url = "bmw-3-series-30"
): Promise<Generation> {
    const generation = new Generation();
    generation.name = name;
    generation.url = url;
    generation.startYear = new Date("2005-01-01");
    generation.endYear = new Date("2011-01-01");
    generation.chassisType = "E46";
    generation.imageUrl = `/img/gen/${url}.png`;
    if (model) generation.model = model;
    await manager().save(generation);
    return generation;
}

async function seedTrim(generation: Generation | null, name = "320i", url = "bmw-320i"): Promise<Trim> {
    const trim = new Trim();
    trim.name = name;
    trim.url = url;
    trim.startYear = new Date("2005-01-01");
    trim.endYear = new Date("2011-01-01");
    trim.imageUrls = [`/img/trims/${url}.png`];
    if (generation) trim.generation = generation;
    await manager().save(trim);
    return trim;
}

async function seedTrimDetails(trim: Trim, overrides: Partial<TrimDetails> = {}): Promise<TrimDetails> {
    const details = Object.assign(new TrimDetails(), overrides);
    details.name = `${trim.name} details`;
    details.url = trim.url;
    await manager().save(details);
    trim.trimDetails = details;
    await manager().save(trim);
    return details;
}

beforeAll(async () => {
    db = await createTestDatabase("fetch-provider");
});

afterAll(async () => {
    await db.dispose();
});

beforeEach(async () => {
    await db.reset();
    RecordedScraper.reset();
});

describe("FetchProvider", () => {
    describe("getBrands", () => {
        test("returns stored brands without opening a browser", async () => {
            await seedBrand("BMW", "bmw-brand-1");
            await seedBrand("Audi", "audi-brand-2");

            const brands = await new FetchProvider().getBrands();

            expect(brands.map((brand) => brand.name)).toEqual(["BMW", "Audi"]);
            expect(RecordedScraper.visited).toEqual([]);
            expect(RecordedScraper.initializeCalls).toBe(0);
            expect(RecordedScraper.closeCalls).toBe(1);
        });

        test("scrapes and stores when the table is empty", async () => {
            RecordedScraper.serveRecording("brands");

            const brands = await new FetchProvider().getBrands();

            expect(RecordedScraper.visited).toEqual([`${BASE}/allbrands`]);
            expect(brands.length).toBeGreaterThan(300);
            expect(brands.every((brand) => brand.id != null)).toBe(true);
            // insert() writes rows but no ids; save() is what fills them in.
            expect(await manager().count(Brand)).toBe(brands.length);
            expect(RecordedScraper.closeCalls).toBe(1);
        });

        test("keeps the rows it can and drops the links it cannot", async () => {
            RecordedScraper.serveHtml(BRANDS_WITH_GAPS);

            const brands = await new FetchProvider().getBrands();

            // Three links carry a slug; the hrefless one and the one with no
            // third segment are dropped.
            expect(brands.map((brand) => brand.url)).toEqual([
                "bmw-brand-1",
                "no-label-brand-2",
                "no-image-brand-3",
            ]);
            expect(brands.map((brand) => brand.name)).toEqual(["BMW", "", "No image"]);
            // Stored absolute: the frontend renders these from another origin,
            // where a site-relative path would resolve to itself and 404.
            expect(brands[0].imageUrl).toBe("https://www.auto-data.net/img/bmw.png");
            expect(brands[1].imageUrl).toBe("");
            expect(await manager().count(Brand)).toBe(3);
        });

        test("rewrites every shape of image src into a URL that can be fetched", async () => {
            RecordedScraper.serveHtml(BRANDS_WITH_IMAGE_URL_SHAPES);

            const brands = await new FetchProvider().getBrands();

            expect(brands.map((brand) => brand.imageUrl)).toEqual([
                // Already absolute: left alone, so a CDN URL keeps working.
                "https://cdn.example.com/logos/absolute.png",
                // Root-relative, the form the site actually writes.
                "https://www.auto-data.net/img/root-relative.png",
                // A missing leading slash would otherwise resolve against the
                // page's own directory, not the site root.
                "https://www.auto-data.net/img/bare-relative.png",
            ]);
        });

        test("returns an empty list when the page has no links", async () => {
            RecordedScraper.serveHtml(EMPTY_PAGE);

            expect(await new FetchProvider().getBrands()).toEqual([]);
            expect(await manager().count(Brand)).toBe(0);
        });

        test("logs and returns an empty list when the read fails", async () => {
            const failure = new Error("no such table: brand");
            spyOn(manager(), "find").mockRejectedValueOnce(failure);
            const {errors} = captureLogs();

            expect(await new FetchProvider().getBrands()).toEqual([]);
            expect(errors).toContain(failure);
            // close() runs in the finally block even when the read threw.
            expect(RecordedScraper.closeCalls).toBe(1);
        });

        test("closes the scraper even when the page fails to load", async () => {
            RecordedScraper.serveRecording("brands");
            spyOn(manager(), "save").mockRejectedValueOnce(new Error("disk full"));
            captureLogs();

            expect(await new FetchProvider().getBrands()).toEqual([]);
            expect(RecordedScraper.closeCalls).toBe(1);
        });
    });

    describe("getBrandWithModels", () => {
        test("returns null for an unknown brand", async () => {
            const {warns} = captureLogs();

            expect(await new FetchProvider().getBrandWithModels(404)).toBeNull();
            expect(warns).toContain("getStoredModelsByBrandId: brandId:404 not found");
            expect(RecordedScraper.visited).toEqual([]);
            expect(RecordedScraper.closeCalls).toBe(1);
        });

        test("returns the brand with its stored models and no scraping", async () => {
            const brand = await seedBrand();
            await seedModel(brand, "3 Series", "bmw-3-series-model-5");
            await seedModel(brand, "1 Series", "bmw-1-series-model-6");

            const found = await new FetchProvider().getBrandWithModels(brand.id);

            expect(found?.models.map((model) => model.name)).toEqual(["3 Series", "1 Series"]);
            expect(RecordedScraper.visited).toEqual([]);
        });

        test("scrapes, stores and reloads the models of a brand that has none", async () => {
            const brand = await seedBrand();
            RecordedScraper.serveRecording("brandModels");

            const found = await new FetchProvider().getBrandWithModels(brand.id);

            expect(RecordedScraper.visited).toEqual([`${BASE}/bmw-brand-1`]);
            expect(found?.models.length).toBeGreaterThan(0);
            // Relations must survive the round trip, not just the in-memory list.
            const stored = await manager().find(Model, {relations: {brand: true}});
            expect(stored).toHaveLength(found!.models.length);
            expect(stored.every((model) => model.brand?.id === brand.id)).toBe(true);
        });

        test("keeps the rows it can and drops the links it cannot", async () => {
            const brand = await seedBrand();
            RecordedScraper.serveHtml(MODELS_WITH_GAPS);

            const found = await new FetchProvider().getBrandWithModels(brand.id);

            expect(found?.models.map((model) => model.url)).toEqual([
                "3-series-model-5",
                "open-ended-model-6",
                "single-year-model-7",
                "bare-model-8",
            ]);
            expect(found?.models.map((model) => model.name)).toEqual([
                "3 Series",
                "Open ended",
                "Single year",
                "",
            ]);
            // "2011 - " has no second year, so only the start survives.
            expect(String(found?.models[1].endYear)).toBe("Invalid Date");
            expect(found?.models[1].imageUrl).toBe("");
            // A row with no year cell at all falls back to "" on both sides.
            expect(String(found?.models[3].startYear)).toBe("Invalid Date");
            expect(String(found?.models[3].endYear)).toBe("Invalid Date");
        });

        test("returns the brand with no models when the page is empty", async () => {
            const brand = await seedBrand();
            RecordedScraper.serveHtml(EMPTY_PAGE);

            const found = await new FetchProvider().getBrandWithModels(brand.id);

            expect(found?.id).toBe(brand.id);
            expect(found?.models).toEqual([]);
        });

        test("returns null when the read fails", async () => {
            const brand = await seedBrand();
            spyOn(manager(), "findOne").mockRejectedValueOnce(new Error("locked"));
            const {errors} = captureLogs();

            expect(await new FetchProvider().getBrandWithModels(brand.id)).toBeNull();
            expect(errors).toHaveLength(1);
            expect(RecordedScraper.closeCalls).toBe(1);
        });

        test("returns the partially loaded brand when storing the models fails", async () => {
            const brand = await seedBrand();
            RecordedScraper.serveRecording("brandModels");
            spyOn(manager(), "save").mockRejectedValueOnce(new Error("disk full"));
            captureLogs();

            const found = await new FetchProvider().getBrandWithModels(brand.id);

            expect(found?.id).toBe(brand.id);
            expect(found?.models).toEqual([]);
            expect(RecordedScraper.closeCalls).toBe(1);
        });
    });

    describe("getModelWithGenerations", () => {
        test("returns null for an unknown model", async () => {
            const {warns} = captureLogs();

            expect(await new FetchProvider().getModelWithGenerations(404)).toBeNull();
            expect(warns).toContain("getStoredModelWithGenerations: No Model for modelId:404");
            expect(RecordedScraper.visited).toEqual([]);
        });

        test("returns null when the model has no brand", async () => {
            const model = await seedModel(null);
            const {warns} = captureLogs();

            expect(await new FetchProvider().getModelWithGenerations(model.id)).toBeNull();
            expect(warns).toContain(`getStoredModelWithGenerations: No Brand for modelId:${model.id}`);
            expect(RecordedScraper.visited).toEqual([]);
        });

        test("returns the model with its stored generations and brand", async () => {
            const brand = await seedBrand();
            const model = await seedModel(brand);
            await seedGeneration(model);
            await seedGeneration(model, "3 Series (4)", "bmw-3-series-31");

            const found = await new FetchProvider().getModelWithGenerations(model.id);

            expect(found?.brand.name).toBe("BMW");
            expect(found?.generations.map((generation) => generation.name)).toEqual([
                "3 Series (3)",
                "3 Series (4)",
            ]);
            expect(RecordedScraper.visited).toEqual([]);
        });

        test("scrapes, stores and reloads the generations of a model that has none", async () => {
            const brand = await seedBrand();
            const model = await seedModel(brand);
            RecordedScraper.serveRecording("modelGenerations");

            const found = await new FetchProvider().getModelWithGenerations(model.id);

            expect(RecordedScraper.visited).toEqual([`${BASE}/bmw-3-series-model-5`]);
            expect(found?.generations.length).toBeGreaterThan(0);
            const stored = await manager().find(Generation, {relations: {model: true}});
            expect(stored).toHaveLength(found!.generations.length);
            expect(stored.every((generation) => generation.model?.id === model.id)).toBe(true);
        });

        test("reads both the current and the finished year marker", async () => {
            const brand = await seedBrand();
            const model = await seedModel(brand);
            RecordedScraper.serveHtml(GENERATIONS_WITH_GAPS);

            const found = await new FetchProvider().getModelWithGenerations(model.id);

            expect(found?.generations.map((generation) => generation.url)).toEqual([
                "3-series-generation-30",
                "current-generation-31",
                "bare-generation-32",
            ]);
            expect(found?.generations.map((generation) => generation.chassisType)).toEqual([
                "E46",
                "G20",
                "",
            ]);
            expect(found?.generations.map((generation) => generation.imageUrl)).toEqual([
                "https://www.auto-data.net/img/gen/3.png",
                "",
                "",
            ]);
            // A finished range, an open one, and a row with no years at all.
            expect(found?.generations[0].startYear).toEqual(new Date("2005-01-01T00:00:00.000Z"));
            expect(found?.generations[1].startYear).toEqual(new Date("2019-01-01T00:00:00.000Z"));
            expect(String(found?.generations[1].endYear)).toBe("Invalid Date");
            expect(String(found?.generations[2].startYear)).toBe("Invalid Date");
        });

        test("returns the model with no generations when the page is empty", async () => {
            const brand = await seedBrand();
            const model = await seedModel(brand);
            RecordedScraper.serveHtml(EMPTY_PAGE);

            const found = await new FetchProvider().getModelWithGenerations(model.id);

            expect(found?.id).toBe(model.id);
            expect(found?.generations).toEqual([]);
        });

        test("returns null when the read fails", async () => {
            const brand = await seedBrand();
            const model = await seedModel(brand);
            spyOn(manager(), "findOne").mockRejectedValueOnce(new Error("locked"));
            captureLogs();

            expect(await new FetchProvider().getModelWithGenerations(model.id)).toBeNull();
            expect(RecordedScraper.closeCalls).toBe(1);
        });
    });

    describe("getGenerationWithTrims", () => {
        test("returns null for an unknown generation", async () => {
            const {warns} = captureLogs();

            expect(await new FetchProvider().getGenerationWithTrims(404)).toBeNull();
            expect(warns).toContain("getStoredGenerationWithTrims: No Generation for generationId:404");
        });

        test("returns null when the generation has no model", async () => {
            const generation = await seedGeneration(null);
            const {warns} = captureLogs();

            expect(await new FetchProvider().getGenerationWithTrims(generation.id)).toBeNull();
            expect(warns).toContain(`getStoredGenerationWithTrims: No Model for generationId:${generation.id}`);
            expect(RecordedScraper.visited).toEqual([]);
        });

        test("returns the generation with its stored trims", async () => {
            const brand = await seedBrand();
            const model = await seedModel(brand);
            const generation = await seedGeneration(model);
            await seedTrim(generation, "320i", "bmw-320i");
            await seedTrim(generation, "335i", "bmw-335i");

            const found = await new FetchProvider().getGenerationWithTrims(generation.id);

            expect(found?.model.name).toBe("3 Series");
            expect(found?.trims.map((trim) => trim.name)).toEqual(["320i", "335i"]);
            expect(RecordedScraper.visited).toEqual([]);
        });

        test("scrapes, stores and reloads the trims of a generation that has none", async () => {
            const brand = await seedBrand();
            const model = await seedModel(brand);
            const generation = await seedGeneration(model);
            RecordedScraper.serveRecording("generationTrims");

            const found = await new FetchProvider().getGenerationWithTrims(generation.id);

            expect(RecordedScraper.visited).toEqual([`${BASE}/bmw-3-series-30`]);
            expect(found?.trims.length).toBeGreaterThan(0);
            const stored = await manager().find(Trim, {relations: {generation: true}});
            expect(stored).toHaveLength(found!.trims.length);
            expect(stored.every((trim) => trim.generation?.id === generation.id)).toBe(true);
        });

        test("shares the gallery across the trims and keeps the rows it can", async () => {
            const brand = await seedBrand();
            const model = await seedModel(brand);
            const generation = await seedGeneration(model);
            RecordedScraper.serveHtml(TRIMS_WITH_GAPS);

            const found = await new FetchProvider().getGenerationWithTrims(generation.id);

            expect(found?.trims.map((trim) => trim.name)).toEqual(["320i", "Current", ""]);
            // The gallery is page-level, so every trim carries the same list,
            // including the img that has no src - which stays empty rather than
            // becoming a URL that renders as a broken image.
            const gallery = [
                "https://www.auto-data.net/img/trims/320.png",
                "",
            ];
            expect(found?.trims[0].imageUrls).toEqual(gallery);
            expect(found?.trims[2].imageUrls).toEqual(gallery);
            expect(String(found?.trims[1].endYear)).toBe("Invalid Date");
            expect(String(found?.trims[2].startYear)).toBe("Invalid Date");
        });

        test("returns the generation with no trims when the page is empty", async () => {
            const brand = await seedBrand();
            const model = await seedModel(brand);
            const generation = await seedGeneration(model);
            RecordedScraper.serveHtml(EMPTY_PAGE);

            const found = await new FetchProvider().getGenerationWithTrims(generation.id);

            expect(found?.id).toBe(generation.id);
            expect(found?.trims).toEqual([]);
        });

        test("returns null when the read fails", async () => {
            const brand = await seedBrand();
            const model = await seedModel(brand);
            const generation = await seedGeneration(model);
            spyOn(manager(), "findOne").mockRejectedValueOnce(new Error("locked"));
            captureLogs();

            expect(await new FetchProvider().getGenerationWithTrims(generation.id)).toBeNull();
            expect(RecordedScraper.closeCalls).toBe(1);
        });
    });

    describe("getTrimWithDetails", () => {
        async function seedFullChain() {
            const brand = await seedBrand();
            const model = await seedModel(brand);
            const generation = await seedGeneration(model);
            const trim = await seedTrim(generation);
            return {brand, model, generation, trim};
        }

        test("returns null for an unknown trim", async () => {
            const {warns} = captureLogs();

            expect(await new FetchProvider().getTrimWithDetails(404)).toBeNull();
            expect(warns).toContain("getStoredTrim: No Trim for trimId:404");
            expect(RecordedScraper.visited).toEqual([]);
        });

        test("returns the trim with its stored details and no scraping", async () => {
            const {trim} = await seedFullChain();
            await seedTrimDetails(trim, {power: "135", brand: "BMW"});

            const found = await new FetchProvider().getTrimWithDetails(trim.id);

            expect(found?.trimDetails?.power).toBe("135");
            expect(found?.trimDetails?.brand).toBe("BMW");
            expect(found?.generation.name).toBe("3 Series (3)");
            expect(RecordedScraper.visited).toEqual([]);
        });

        test("scrapes the specification, stores it and links it to the trim", async () => {
            const {trim} = await seedFullChain();
            RecordedScraper.serveRecording("trimDetails");

            const found = await new FetchProvider().getTrimWithDetails(trim.id);

            expect(RecordedScraper.visited).toEqual([`${BASE}/bmw-320i`]);
            const details = found?.trimDetails;
            expect(details).toBeDefined();
            // Named rather than positional, so reordering the page cannot break
            // this: these are the columns the frontend renders.
            for (const field of ["brand", "model", "generation", "modification", "bodyType", "power"]) {
                expect(details![field as keyof TrimDetails]).toBeTruthy();
            }
            // The link has to be persisted, otherwise every request rescrapes.
            const storedTrim = await manager().findOne(Trim, {
                where: {id: trim.id},
                relations: {trimDetails: true},
            });
            expect(storedTrim?.trimDetails).toBeDefined();
            expect(await manager().count(TrimDetails)).toBe(1);
        });

        test("records ? for a value hidden behind the data lock", async () => {
            const {trim} = await seedFullChain();
            RecordedScraper.serveHtml(DETAILS_WITH_GAPS);

            const found = await new FetchProvider().getTrimWithDetails(trim.id);

            expect(found?.trimDetails?.brand).toBe("BMW");
            // Unlocked values are read, locked ones are recorded as "?" so the
            // UI can tell the user to log in rather than showing "Log in to see."
            // The page carries one of each; the locked one is last, so it wins.
            expect(found?.trimDetails?.engineOilSpecification).toBe("?");
            expect(found?.trimDetails?.coolantCapacity).toBe("7 l");
            // <br> separated entries become a comma separated list.
            expect(found?.trimDetails?.assistingSystems).toBe("ABS, ESP, TCS");
            // Rows missing a label or a value are skipped, not guessed at.
            expect(found?.trimDetails?.seats).toBe("");
        });

        // One test per shape rather than one page carrying them all: a page
        // yields a single value per label, so several rows of the same label
        // would only ever assert the last one.
        test.each(ASSISTING_SYSTEMS_SHAPES)(
            "joins the assisting systems list without stray separators: $expected",
            async ({html, expected}) => {
                const {trim} = await seedFullChain();
                RecordedScraper.serveHtml(`
                  <div class="cardetailsout">
                    <div class="cardetails">
                      <div class="row"><div class="par">Brand</div><div class="val">BMW</div></div>
                      <div class="row"><div class="par">Assisting systems</div>
                        <div class="val">${html}</div>
                      </div>
                    </div>
                  </div>
                `);

                const found = await new FetchProvider().getTrimWithDetails(trim.id);

                expect(found?.trimDetails?.assistingSystems).toBe(expected);
            },
        );

        test("does not crash when the specification is missing entirely", async () => {
            const {trim} = await seedFullChain();
            RecordedScraper.serveHtml(EMPTY_PAGE);

            const found = await new FetchProvider().getTrimWithDetails(trim.id);

            expect(found?.id).toBe(trim.id);
            expect(found?.trimDetails).toBeDefined();
            expect(RecordedScraper.closeCalls).toBe(1);
        });

        test("returns null when the read fails", async () => {
            const {trim} = await seedFullChain();
            spyOn(manager(), "findOne").mockRejectedValueOnce(new Error("locked"));
            captureLogs();

            expect(await new FetchProvider().getTrimWithDetails(trim.id)).toBeNull();
            expect(RecordedScraper.closeCalls).toBe(1);
        });

        test("returns the trim without details when storing them fails", async () => {
            const {trim} = await seedFullChain();
            RecordedScraper.serveRecording("trimDetails");
            spyOn(manager(), "insert").mockRejectedValueOnce(new Error("disk full"));
            const {errors} = captureLogs();

            const found = await new FetchProvider().getTrimWithDetails(trim.id);

            expect(found?.id).toBe(trim.id);
            expect(errors).toHaveLength(1);
            expect(await manager().count(TrimDetails)).toBe(0);
            expect(RecordedScraper.closeCalls).toBe(1);
        });
    });

    test("the provider configures the scraper for a long, headless page load", async () => {
        RecordedScraper.serveRecording("brands");
        await new FetchProvider().getBrands();

        expect(RecordedScraper.lastInstance.options).toEqual({
            headless: true,
            timeout: 60000,
        });
    });
});