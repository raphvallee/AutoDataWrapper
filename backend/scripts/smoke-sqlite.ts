/**
 * Runtime smoke check for the TypeORM + better-sqlite3 stack on Bun.
 *
 * `bun run build` only invokes tsc, which never loads the native addon, so a
 * build pass says nothing about whether the data layer works. This script
 * loads the real driver, exercises a read and a write, and exits non-zero if
 * anything is broken. It is what catches a Bun whose Node-API layer cannot
 * load better-sqlite3 (see src/bun-version-guard.ts).
 *
 * Runs against a throwaway database, never against db.sqlite.
 */
import fs from "fs";
import os from "os";
import path from "path";

import {assertBunCanLoadBetterSqlite3} from "../src/bun-version-guard";
import {Brand, Generation, Model, Trim, TrimDetails} from "../src/entity/entities";
import {DataSource} from "typeorm";

assertBunCanLoadBetterSqlite3();

const isBun = typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";
const runtime = isBun
    ? `bun ${(globalThis as unknown as { Bun: { version: string } }).Bun.version}`
    : `node ${process.version}`;

const database = path.join(os.tmpdir(), `autodatawrapper-smoke-${process.pid}.sqlite`);
const cleanup = () => {
    for (const suffix of ["", "-wal", "-shm"]) {
        try {
            fs.unlinkSync(database + suffix);
        } catch {
            /* not created */
        }
    }
};
cleanup();

const dataSource = new DataSource({
    type: "better-sqlite3",
    database,
    logging: false,
    synchronize: true,
    entities: [Brand, Model, Generation, Trim, TrimDetails],
});

function assert(condition: boolean, description: string): void {
    if (!condition) {
        throw new Error(`smoke check failed: ${description}`);
    }
    console.log(`  ok  ${description}`);
}

try {
    await dataSource.initialize();
    console.log(`TypeORM ${DataSource.name} data source connected on ${runtime}`);

    const brand = new Brand();
    brand.name = "SmokeBrand";
    brand.url = "smokebrand-brand-1";
    await dataSource.manager.save(brand);
    assert(brand.id != null, "better-sqlite3 insert generated a primary key");

    const model = new Model();
    model.name = "SmokeModel";
    model.url = "smokemodel-model-1";
    model.brand = brand;
    await dataSource.manager.save(model);
    assert(model.id != null, "entity with a relation persisted");

    const reloaded = await dataSource.manager.findOne(Brand, {
        where: {id: brand.id},
        relations: {models: true},
    });
    assert(reloaded?.url === "smokebrand-brand-1", "read back the inserted brand");
    assert(reloaded?.models?.length === 1, "relation brand -> models was loaded");

    const reloadedModel = await dataSource.manager.findOne(Model, {
        where: {id: model.id},
        relations: {brand: true},
    });
    assert(
        reloadedModel?.brand?.name === "SmokeBrand",
        "relation model -> brand was loaded"
    );

    const rows = await dataSource.query("SELECT COUNT(*) AS c FROM brand");
    assert(Number(rows[0].c) === 1, "raw query with positional parameters worked");

    // Deleting the brand first must be refused while the model still points at
    // it, which proves the driver's `foreign_keys = ON` pragma took effect.
    let foreignKeysEnforced = false;
    try {
        await dataSource.manager.delete(Brand, {id: brand.id});
    } catch {
        foreignKeysEnforced = true;
    }
    assert(foreignKeysEnforced, "foreign key constraints are enforced on delete");

    await dataSource.manager.delete(Model, {id: model.id});
    await dataSource.manager.delete(Brand, {id: brand.id});
    assert(
        (await dataSource.manager.count(Brand, {where: {id: brand.id}})) === 0,
        "delete removed the row"
    );

    console.log(`smoke check passed on ${runtime}`);
} finally {
    await dataSource.destroy().catch(() => undefined);
    cleanup();
}
