import {JSDOM} from "jsdom";

/**
 * Runs `fn` with `document` pointing at a freshly parsed page.
 *
 * The scrapers hand their extraction closures to `page.evaluate`, which
 * normally runs them inside Chromium. Here they run in-process instead, so the
 * selectors are exercised against real HTML and real DOM semantics rather than
 * a hand-written fake - a fake would happily accept selectors jsdom rejects.
 *
 * The callbacks only touch the `document` global (the `Element` type is
 * erased at compile time), so rebinding those two globals is enough.
 */
export function withDom<T>(bodyHtml: string, fn: () => T): T {
    const dom = new JSDOM(`<!doctype html><html><body>${bodyHtml}</body></html>`);
    const globals = globalThis as unknown as Record<string, unknown>;
    const previousDocument = globals.document;
    const previousElement = globals.Element;

    globals.document = dom.window.document;
    globals.Element = dom.window.Element;
    try {
        return fn();
    } finally {
        globals.document = previousDocument;
        globals.Element = previousElement;
        dom.window.close();
    }
}