import {defineConfig} from "vitest/config";

export default defineConfig({
    test: {
        include: ["test/**/*.test.ts"],
        // Every file gets its own module registry, so the module mocks one file
        // registers cannot be seen by another.
        isolate: true,
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            // skipFull: false, so the table lists every file at 100% instead of
            // printing an empty body, which reads like "nothing was measured".
            reporter: [
                ["text", {skipFull: false}],
                ["lcov"],
            ],
            // 100% on every metric, which is what the suite was built for.
            // Anything that genuinely cannot execute is excluded in the source
            // with a `v8 ignore` hint and a comment saying why - there are four
            // in fetch-provider.service.ts and ten in entities.ts (all of them
            // the design:type ternary oxc emits for class-typed fields).
            thresholds: {
                lines: 100,
                functions: 100,
                statements: 100,
                branches: 100,
            },
        },
    },
});