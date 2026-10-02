/**
 * Drops and recreates the SQLite schema.
 *
 * Replaces the old `typeorm-ts-node-commonjs schema:sync` call in
 * update-db-schema.ps1. That CLI loads the data source through ts-node on Node,
 * which cannot resolve the extensionless import in data-source.ts
 * (`Cannot find module './bun-version-guard'`), and ts-node is not even a
 * dependency any more. Running the data source on Bun sidesteps both: the same
 * module the server uses, loaded the same way.
 *
 * AppDataSource is configured with synchronize: true, so initializing it
 * creates every table and column from the entity metadata. That is the same
 * schema:sync would have produced.
 */
import fs from "fs";
import path from "path";

import {assertBunCanLoadBetterSqlite3} from "../src/bun-version-guard";

assertBunCanLoadBetterSqlite3();

// data-source.ts resolves the database relative to the working directory, so
// this only matches the file the app opens when run from backend/.
const database = path.resolve("db.sqlite");

for (const suffix of ["", "-wal", "-shm"]) {
    const file = database + suffix;
    if (!fs.existsSync(file)) continue;
    fs.unlinkSync(file);
    console.log(`deleted ${path.basename(file)}`);
}

console.log(`recreating schema in ${database}`);

// Imported after the delete so the data source picks up the fresh file.
const {AppDataSource} = await import("../src/data-source");

try {
    await AppDataSource.initialize();
    const tables = await AppDataSource.query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    console.log(`schema is up to date: ${tables.length} tables (${tables.map((t: {name: string}) => t.name).join(", ")})`);
} finally {
    await AppDataSource.destroy().catch(() => undefined);
}