import {expect, test} from "./harness";
import fs from "fs";
import path from "path";

import {createTestDatabase} from "./helpers/test-db";

/**
 * What `bun run sync:db` (and update-db-schema.ps1) guarantees: the schema on
 * disk matches the entity metadata, so the app finds every column it reads.
 *
 * sync-db.ts is a thin wrapper - delete db.sqlite, then initialize the data
 * source, which is configured with synchronize: true - so that is what is
 * asserted here. Running the wrapper itself would write to the development
 * database, and it resolves its path from the working directory, which is the
 * one thing it cannot do in a test without touching db.sqlite.
 *
 * The risk being covered is drift: an entity gains a column and the database
 * does not, or the reverse, and the failure surfaces as an undefined field on
 * an API response rather than as an error.
 */
const COLUMNS: Record<string, string[]> = {
    brand: ["id", "name", "url", "imageUrl", "updatedAt"],
    model: ["id", "name", "url", "updatedAt", "startYear", "endYear", "imageUrl", "brandId"],
    generation: [
        "id",
        "name",
        "url",
        "updatedAt",
        "startYear",
        "endYear",
        "chassisType",
        "imageUrl",
        "modelId",
    ],
    trim: [
        "id",
        "name",
        "url",
        "updatedAt",
        "startYear",
        "endYear",
        "imageUrls",
        "generationId",
        "trimDetailsId",
    ],
    trim_details: [
        "id",
        "name",
        "url",
        "updatedAt",
        // The columns the service reads. The full set is asserted elsewhere
        // (entities.test.ts counts them all); listing the important ones here
        // is what catches a rename that would break an API response.
        "brand",
        "model",
        "generation",
        "modification",
        "startOfProduction",
        "endOfProduction",
        "powertrainArchitecture",
        "bodyType",
        "seats",
        "doors",
        "fuelConsumptionUrban",
        "fuelConsumptionExtraUrban",
        "fuelConsumptionCombined",
        "co2Emissions",
        "fuelType",
        "acceleration0100",
        "acceleration062",
        "acceleration060",
        "maximumSpeed",
        "maximumEngineSpeed",
        "emissionStandard",
        "weightToPowerRatio",
        "weightToTorqueRatio",
        "power",
        "powerPerLitre",
        "torque",
        "engineLayout",
        "engineModelCode",
        "engineDisplacement",
        "numberOfCylinders",
        "engineConfiguration",
        "cylinderBore",
        "pistonStroke",
        "compressionRatio",
        "valvesPerCylinder",
        "fuelInjectionSystem",
        "engineAspiration",
        "valvetrain",
        "engineOilCapacity",
        "engineOilSpecification",
        "coolantCapacity",
        "kerbWeight",
        "maxWeight",
        "maxLoad",
        "trunkSpaceMin",
        "fuelTankCapacity",
        "maxRoofLoad",
        "permittedTrailerLoadWithBrakes",
        "permittedTrailerLoadWithoutBrakes",
        "permittedTowbarDownload",
        "length",
        "width",
        "widthIncludingMirrors",
        "height",
        "wheelbase",
        "frontTrack",
        "rearTrack",
        "rideHeight",
        "dragCoefficient",
        "minimumTurningCircle",
        "driveWheel",
        "gearbox",
        "frontSuspension",
        "rearSuspension",
        "frontBrakes",
        "rearBrakes",
        "assistingSystems",
        "steeringType",
        "powerSteering",
        "tiresSize",
        "wheelRimsSize",
    ],
};

test("initializing the data source creates every column the service reads", async () => {
    const db = await createTestDatabase("sync-db");
    try {
        for (const table of ["brand", "model", "generation", "trim", "trim_details"]) {
            const present = (
                (await db.dataSource.query(`SELECT name FROM pragma_table_info('${table}')`)) as {
                    name: string;
                }[]
            )
                .map((column) => column.name.toLowerCase())
                .sort();

            expect(present).toEqual([...COLUMNS[table].map((c) => c.toLowerCase())].sort());
        }
    } finally {
        await db.dispose();
    }
});

test("all five entities are registered, so no table is left behind", async () => {
    const db = await createTestDatabase("sync-db-entities");
    try {
        const tables = (
            (await db.dataSource.query(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            )) as {name: string}[]
        ).map((table) => table.name);

        expect(tables).toEqual(["brand", "generation", "model", "trim", "trim_details"]);
        // Order is TypeORM's, not ours; the set is the point.
        expect(
            db.dataSource.entityMetadatas.map((metadata) => metadata.targetName).sort()
        ).toEqual(["Brand", "Generation", "Model", "Trim", "TrimDetails"]);
    } finally {
        await db.dispose();
    }
});

test("sync:db is idempotent: re-running it produces the same schema", async () => {
    // synchronize: true is what sync-db relies on, so dropping and rebuilding
    // twice must not accumulate or drop anything.
    const db = await createTestDatabase("sync-db-idempotent");
    try {
        const before = await db.dataSource.query(
            "SELECT sql FROM sqlite_master WHERE type = 'table' ORDER BY name"
        );

        await db.reset();

        const after = await db.dataSource.query(
            "SELECT sql FROM sqlite_master WHERE type = 'table' ORDER BY name"
        );

        expect(after).toEqual(before);
    } finally {
        await db.dispose();
    }
});

test("the script deletes the database file and its sidecars", () => {
    // sync-db.ts removes db.sqlite plus -wal and -shm, which SQLite recreates
    // if a stale one survives next to a fresh file.
    const source = fs.readFileSync(
        path.join(import.meta.dirname, "..", "scripts", "sync-db.ts"),
        "utf8"
    );
    expect(source).toContain('"", "-wal", "-shm"');
    // It goes through the guard so an old Bun cannot half-open the addon.
    expect(source).toContain("assertBunCanLoadBetterSqlite3()");

    // It resolves the path from the working directory, so it has to run from
    // backend/ - which is what the npm script and the .ps1 both do.
    const script = (
        JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "package.json"), "utf8")) as {
            scripts: Record<string, string>;
        }
    ).scripts;
    expect(script["sync:db"]).toBe("bun run scripts/sync-db.ts");
});