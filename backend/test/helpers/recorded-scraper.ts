import {readFileSync} from "fs";
import path from "path";

import {withDom} from "./dom";

/** The five pages the scrapers read, as recorded from the live site. */
export const RECORDING_FILES = {
    brands: "brands.html",
    brandModels: "brand-models.html",
    modelGenerations: "model-generations.html",
    generationTrims: "generation-trims.html",
    trimDetails: "trim-details.html",
} as const;

export type RecordingName = keyof typeof RECORDING_FILES;

// Resolved relative to this file rather than to import.meta.dir, which only
// Bun defines. The recordings live next to this helper.
const RECORDING_DIR = path.join(__dirname, "recordings");

export function readRecording(name: RecordingName): string {
    return readFileSync(path.join(RECORDING_DIR, RECORDING_FILES[name]), "utf8");
}

/**
 * Stands in for ScraperEngine by replaying recorded pages.
 *
 * The extraction closures under test are the real ones from
 * fetch-provider.service.ts; only the browser is replaced, and it is replaced
 * with real markup captured from auto-data.net (see
 * `bun run record:fixtures`) rather than with a hand-written guess. So a
 * change to the site's layout shows up here as failing assertions about the
 * extracted data, which is the point.
 *
 * serveRecording() picks the page; serveHtml() injects a synthetic one for the
 * defensive paths a real page may not contain.
 */
export class RecordedScraper {
    /** HTML served for every goto, unless overridden per url. */
    static page = "";
    private static readonly byUrl = new Map<string, string>();

    static visited: string[] = [];
    static initializeCalls = 0;
    static closeCalls = 0;
    static instances: RecordedScraper[] = [];

    static reset(): void {
        RecordedScraper.page = "";
        RecordedScraper.byUrl.clear();
        RecordedScraper.visited = [];
        RecordedScraper.initializeCalls = 0;
        RecordedScraper.closeCalls = 0;
        RecordedScraper.instances = [];
    }

    static serveRecording(name: RecordingName): void {
        RecordedScraper.page = readRecording(name);
    }

    static serveHtml(html: string): void {
        RecordedScraper.page = html;
    }

    /** Serves `html` only for one exact url. */
    static serveUrl(url: string, html: string): void {
        RecordedScraper.byUrl.set(url, html);
    }

    static get lastInstance(): RecordedScraper {
        const instance = RecordedScraper.instances.at(-1);
        if (!instance) throw new Error("no RecordedScraper was constructed");
        return instance;
    }

    private html = "";

    readonly page = {
        evaluate: (fn: () => unknown) => withDom(this.html, fn),
    };

    constructor(readonly options: unknown) {
        RecordedScraper.instances.push(this);
    }

    async initialize(): Promise<void> {
        RecordedScraper.initializeCalls++;
    }

    async goto(url: string): Promise<void> {
        RecordedScraper.visited.push(url);
        const html = RecordedScraper.byUrl.get(url) ?? RecordedScraper.page;
        if (!html) {
            throw new Error(
                `no page recorded for ${url}. Call RecordedScraper.serveRecording() first, ` +
                    `or re-run \`bun run record:fixtures\`.`
            );
        }
        this.html = html;
    }

    async close(): Promise<void> {
        RecordedScraper.closeCalls++;
    }
}