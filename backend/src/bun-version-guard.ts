// better-sqlite3 is a native N-API addon. Bun 1.3.x and 1.4.0 abort inside
// `require("better-sqlite3")` with
//   panic(main thread): NAPI FATAL ERROR: Error::New napi_get_last_error_info
// because Bun's `napi_create_reference` rejected the primitive references that a
// NAPI_VERSION 10 addon uses, leaving node-addon-api holding a null env
// (oven-sh/bun#36089). Fixed in Bun 1.4.1. On an unfixed Bun the process dies
// with no stack trace and exit code 0, so the version is asserted before
// TypeORM is allowed to load the addon.
const MIN_BUN_VERSION = [1, 4, 1]

function isOlderThan(actual: number[], minimum: number[]): boolean {
    for (let i = 0; i < minimum.length; i++) {
        // A missing component counts as 0, so "1.4" is older than "1.4.1"
        // rather than silently passing.
        const a = actual[i] ?? 0;
        if (a > minimum[i]) return false
        if (a < minimum[i]) return true
    }
    return false
}

// The version is a parameter with a default so tests can exercise the
// comparison against every version. `Bun.version` is a non-writable,
// non-configurable property, so it cannot be stubbed from a test.
export function assertBunCanLoadBetterSqlite3(
    // Undefined on Node, which loads the addon through Node's own N-API.
    bunVersion: string | undefined = (globalThis as { Bun?: { version: string } }).Bun?.version
): void {
    if (!bunVersion) return

    if (isOlderThan(bunVersion.split(".").map(Number), MIN_BUN_VERSION)) {
        throw new Error(
            `Bun ${bunVersion} cannot load better-sqlite3 and exits silently. ` +
                `Run \`bun upgrade\` (needs >= ${MIN_BUN_VERSION.join(".")}), ` +
                `or run this backend on Node instead.`
        )
    }
}
