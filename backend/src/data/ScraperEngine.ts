import puppeteer, {Browser, Page} from 'puppeteer';

interface ScraperOptions {
    headless?: boolean;
    timeout?: number;
}

export class ScraperEngine {
    protected browser: Browser | null = null;

    constructor(protected options: ScraperOptions = {}) {
        this.options = {
            headless: true,
            timeout: 30000,
            ...options,
        };
    }

    private _page: Page | null = null;

    get page(): Page | null {
        return this._page;
    }

    public async initialize() {
        if (this.browser) {
            return;
        }
        try {
            this.browser = await puppeteer.launch({
                headless: this.options.headless,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            this._page = await this.browser.newPage();
            await this._page.setViewport({width: 1600, height: 900});
        } catch (e) {
            // Leave no half-initialised state behind, otherwise the next
            // call sees a truthy browser and skips the launch entirely.
            this.browser = null;
            this._page = null;
            throw e;
        }
    }

    public async goto(url: string) {
        if (!this._page) await this.initialize();
        await this._page!.goto(url, {
            waitUntil: 'networkidle2',
            timeout: this.options.timeout,
        });
    }

    public async close() {
        // Capture first: close() must be idempotent and must always clear
        // the handles, even if the browser is already gone. Callers invoke
        // this from a finally block, where a throw would mask the real
        // result and surface as an unhandled rejection.
        const browser = this.browser;
        this.browser = null;
        this._page = null;
        if (!browser) {
            return;
        }
        try {
            await browser.close();
        } catch {
            // The browser died on its own; nothing left to clean up.
        }
    }
}
