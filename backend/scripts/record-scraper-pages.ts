/**
 * Records the five pages the scrapers read, so the offline tests run against
 * real markup instead of hand-written guesses.
 *
 *   bun run record:fixtures
 *
 * Run it whenever the extraction changes, or to find out whether the site has
 * moved on: if a re-recording makes a test fail, the layout is what changed,
 * not the code.
 *
 * Pages are picked for richness (the brand with the most models, the model with
 * the most generations), because a fixture with a single row would let an
 * extraction bug pass unnoticed.
 */
import fs from "fs";
import path from "path";

const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const OUT_DIR = path.join(import.meta.dir, "..", "test", "helpers", "recordings");

/** The slug the scrapers take from an href: its third path segment. */
function slugFrom(href: string | null): string {
    const slug = href?.split("/")[2];
    if (!slug) throw new Error(`no slug in href: ${href}`);
    return slug;
}

const cache = new Map<string, string>();

async function fetchPage(slug: string): Promise<string> {
    const cached = cache.get(slug);
    if (cached) return cached;
    const response = await fetch(`https://www.auto-data.net/en/${slug}`, {
        headers: {"User-Agent": UA},
        signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`GET /en/${slug} -> ${response.status}`);
    const html = await response.text();
    cache.set(slug, html);
    return html;
}

function slugsIn(html: string, pattern: RegExp): string[] {
    const slugs: string[] = [];
    for (const match of html.matchAll(pattern)) {
        const slug = slugFrom(match[1]);
        if (slug && !slugs.includes(slug)) slugs.push(slug);
    }
    return slugs;
}

/**
 * Drops <script>, <style> and comments, which the extraction never reads and
 * which are most of the payload. Everything a selector can match is kept.
 */
function stripNoise(html: string): string {
    return html
        .replace(/<script\b[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[\s\S]*?<\/style>/gi, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\n\s*\n+/g, "\n");
}

const written: {file: string; kB: string}[] = [];

function record(name: string, html: string): void {
    fs.mkdirSync(OUT_DIR, {recursive: true});
    const file = path.join(OUT_DIR, `${name}.html`);
    const cleaned = stripNoise(html);
    fs.writeFileSync(file, cleaned, "utf8");
    written.push({file: `${name}.html`, kB: `${(Buffer.byteLength(cleaned) / 1024).toFixed(1)} kB`});
}

/**
 * Fetches candidates until one of them has the most marker matches.
 *
 * Candidates are sampled across the whole list rather than taken from the front:
 * the first few brands alphabetically are obscure ones with a handful of models,
 * and a fixture from one of those would let an extraction bug pass unnoticed.
 */
async function richest(
    candidates: string[],
    marker: RegExp,
    maxTries: number
): Promise<{slug: string; html: string; count: number}> {
    let best = {slug: "", html: "", count: -1};
    const step = Math.max(1, Math.floor(candidates.length / maxTries));
    for (const slug of candidates.filter((_, index) => index % step === 0).slice(0, maxTries)) {
        const html = await fetchPage(slug);
        const count = (html.match(marker) ?? []).length;
        if (count > best.count) best = {slug, html, count};
    }
    if (best.count <= 0) throw new Error(`no candidate matched ${marker} within ${maxTries} tries`);
    return best;
}

const brands = await fetchPage("allbrands");
record("brands", brands);

const brand = await richest(
    slugsIn(brands, /<div class="brands">[\s\S]*?href="([^"]+)"/g),
    /<a class="modeli"/g,
    6
);
record("brand-models", brand.html);

const model = await richest(
    slugsIn(brand.html, /<a class="modeli"[^>]*href="([^"]+)"/g),
    /<div class="generr"[\s\S]*?class="f /g,
    6
);
record("model-generations", model.html);

const generationSlugs = slugsIn(model.html, /<div class="generr"[\s\S]*?<a href="([^"]+)"/g);
const generation = generationSlugs[0]
    ? {slug: generationSlugs[0], html: await fetchPage(generationSlugs[0])}
    : {slug: "", html: ""};
record("generation-trims", generation.html);

const trimSlug = slugsIn(generation.html, /<div class="tri[\s\S]*?<a href="([^"]+)"/g)[0];
record("trim-details", await fetchPage(trimSlug));

console.log(`recorded to ${OUT_DIR}`);
for (const {file, kB} of written) console.log(`  ${file.padEnd(26)} ${kB.padStart(9)}`);
console.log(
    `\nchosen for richness: ${brand.slug} (${brand.count} models) -> ${model.slug} (${model.count} generations) -> ${generation.slug} -> ${trimSlug}`
);