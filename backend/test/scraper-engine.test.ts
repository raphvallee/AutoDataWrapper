import {beforeEach, describe, expect, fn, mockModule, test} from "./harness";

import type {Browser, Page} from "puppeteer";

const launch = fn(async () => browser);

mockModule("puppeteer", () => ({default: {launch}}));

const {ScraperEngine} = await import("../src/data/ScraperEngine");

let browser: Browser;
let page: Page;

beforeEach(() => {
    launch.mockClear();
    browser = {
        newPage: fn(async () => page),
        close: fn(async () => undefined),
    } as unknown as Browser;
    page = {
        goto: fn(async () => null),
        setViewport: fn(async () => undefined),
    } as unknown as Page;
});

describe("ScraperEngine", () => {
    describe("options", () => {
        test("defaults to headless with a 30s timeout", async () => {
            const engine = new ScraperEngine();
            await engine.initialize();

            expect(launch).toHaveBeenCalledWith({
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            });
            expect(page.goto).not.toHaveBeenCalled();
        });

        test("passes the caller's options through", async () => {
            const engine = new ScraperEngine({headless: false, timeout: 60000});
            await engine.initialize();
            await engine.goto("https://example.test/");

            expect(page.goto).toHaveBeenCalledWith("https://example.test/", {
                waitUntil: "networkidle2",
                timeout: 60000,
            });
        });

        test("page is null before initialize", () => {
            expect(new ScraperEngine().page).toBeNull();
        });
    });

    describe("initialize", () => {
        test("launches a browser and sizes the page", async () => {
            const engine = new ScraperEngine();
            await engine.initialize();

            expect(engine.page).toBe(page);
            expect(page.setViewport).toHaveBeenCalledWith({width: 1600, height: 900});
        });

        test("is idempotent: a second call reuses the browser", async () => {
            const engine = new ScraperEngine();
            await engine.initialize();
            await engine.initialize();

            expect(launch).toHaveBeenCalledTimes(1);
            expect(page.setViewport).toHaveBeenCalledTimes(1);
        });

        test("clears both handles when the launch fails", async () => {
            const engine = new ScraperEngine();
            launch.mockImplementationOnce(async () => {
                throw new Error("browser not found");
            });

            await expect(engine.initialize()).rejects.toThrow("browser not found");

            // Without this reset the next call sees a truthy browser, skips the
            // launch and reuses a dead page - the bug this guards against.
            expect(engine.page).toBeNull();
            launch.mockImplementation(async () => browser);
            await engine.initialize();
            expect(engine.page).toBe(page);
            expect(launch).toHaveBeenCalledTimes(2);
        });

        test("clears the browser when newPage fails", async () => {
            const engine = new ScraperEngine();
            browser.newPage = fn(async () => {
                throw new Error("target closed");
            }) as unknown as Browser["newPage"];

            await expect(engine.initialize()).rejects.toThrow("target closed");
            expect(engine.page).toBeNull();
        });
    });

    describe("goto", () => {
        test("initializes on demand when there is no page yet", async () => {
            const engine = new ScraperEngine();
            await engine.goto("https://example.test/");

            expect(launch).toHaveBeenCalledTimes(1);
            expect(page.goto).toHaveBeenCalledWith("https://example.test/", {
                waitUntil: "networkidle2",
                timeout: 30000,
            });
        });

        test("propagates navigation failures", async () => {
            const engine = new ScraperEngine();
            page.goto = fn(async () => {
                throw new Error("net::ERR_TIMED_OUT");
            }) as unknown as Page["goto"];

            await expect(engine.goto("https://example.test/")).rejects.toThrow(
                "net::ERR_TIMED_OUT"
            );
        });
    });

    describe("close", () => {
        test("closes the browser and drops the handles", async () => {
            const engine = new ScraperEngine();
            await engine.initialize();
            await engine.close();

            expect(browser.close).toHaveBeenCalledTimes(1);
            expect(engine.page).toBeNull();
        });

        test("is idempotent and safe before initialize", async () => {
            const engine = new ScraperEngine();
            await expect(engine.close()).resolves.toBeUndefined();
            expect(browser.close).not.toHaveBeenCalled();

            await engine.initialize();
            await engine.close();
            await expect(engine.close()).resolves.toBeUndefined();
            expect(browser.close).toHaveBeenCalledTimes(1);
        });

        test("swallows a browser that already died", async () => {
            const engine = new ScraperEngine();
            await engine.initialize();
            browser.close = fn(async () => {
                throw new Error("Protocol error");
            }) as unknown as Browser["close"];

            // close() runs in a finally block: throwing here would mask the
            // real result and surface as an unhandled rejection.
            await expect(engine.close()).resolves.toBeUndefined();
            expect(engine.page).toBeNull();
        });

        test("a closed engine relaunches on the next use", async () => {
            const engine = new ScraperEngine();
            await engine.initialize();
            await engine.close();
            await engine.initialize();

            expect(launch).toHaveBeenCalledTimes(2);
            expect(engine.page).toBe(page);
        });
    });
});