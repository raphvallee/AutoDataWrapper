import fs from "fs";
import os from "os";
import path from "path";

import {DataSource} from "typeorm";

import {Brand, Generation, Model, Trim, TrimDetails} from "../../src/entity/entities";

export interface TestDatabase {
    dataSource: DataSource;
    /** Drops and recreates every table, so tests start from an empty schema. */
    reset(): Promise<void>;
    dispose(): Promise<void>;
}

/**
 * A real TypeORM data source on a throwaway SQLite file.
 *
 * The service under test reaches the database through `AppDataSource`, so a
 * hand-written fake manager would test the fake instead of the SQL: relations,
 * cascades and column types are exactly what these tests need to pin down. The
 * file lives in the temp directory, never next to db.sqlite.
 */
export async function createTestDatabase(label: string): Promise<TestDatabase> {
    const database = path.join(
        os.tmpdir(),
        `autodatawrapper-test-${label}-${process.pid}-${counter()}.sqlite`
    );
    removeDatabaseFiles(database);

    const dataSource = new DataSource({
        type: "better-sqlite3",
        database,
        logging: false,
        synchronize: true,
        entities: [Brand, Model, Generation, Trim, TrimDetails],
    });
    await dataSource.initialize();

    return {
        dataSource,
        reset: () => dataSource.synchronize(true),
        async dispose() {
            await dataSource.destroy().catch(() => undefined);
            removeDatabaseFiles(database);
        },
    };
}

function removeDatabaseFiles(database: string): void {
    for (const suffix of ["", "-wal", "-shm"]) {
        try {
            fs.unlinkSync(database + suffix);
        } catch {
            /* never created */
        }
    }
}

let sequence = 0;

function counter(): string {
    return (sequence++).toString(36);
}