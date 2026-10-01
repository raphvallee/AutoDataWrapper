import path from "path";

import {assertBunCanLoadBetterSqlite3} from "./bun-version-guard";

assertBunCanLoadBetterSqlite3();

import {DataSource} from "typeorm";
import {Brand, Generation, Model, Trim, TrimDetails} from "./entity/entities";

// The path is resolved before handing it to TypeORM because
// BetterSqlite3Driver calls `fs.promises.mkdir(path.dirname(database),
// { recursive: true })` first, and Bun 1.4.2 rejects the degenerate relative
// directories that a bare filename produces (`mkdir(".")` throws EEXIST,
// `mkdir("./")` throws ENOENT, where Node succeeds for both). An absolute path
// resolves to a real, named directory, which Bun handles correctly.
const database = path.resolve("db.sqlite");

// Entities are listed explicitly rather than via a glob. A glob like
// "src/entity/*.ts" only resolves when the sources are run directly
// (bun --watch src/index.ts); running the compiled output
// (bun dist/index.js) made TypeORM load raw TypeScript and crash on the
// first decorator.
export const AppDataSource = new DataSource({
    type: "better-sqlite3",
    database,
    logging: false,
    synchronize: true, // ONLY FOR DEV, will scrap db each restart
    entities: [Brand, Model, Generation, Trim, TrimDetails],
    subscribers: [],
    migrations: [],
})
