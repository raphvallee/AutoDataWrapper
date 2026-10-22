/**
 * Repairs trim_details rows stored before the trailing-<br> fix in
 * scrapeTrimDetailsByTrimUrl: a cell whose last <br> had no entry after it
 * became a value ending in ", ", which the UI then rendered verbatim.
 *
 * Only rows that still carry the old shape are touched, and only their
 * trailing separator is removed, so a legitimately comma-ended value cannot be
 * mangled. Idempotent: a second run finds nothing to do.
 *
 *   bun run scripts/fix-assisting-systems.ts
 */
import {AppDataSource} from "../src/data-source";
import {TrimDetails} from "../src/entity/entities";

await AppDataSource.initialize();

try {
    // A stored value ends in the separator only because of the bug, so the
    // trailing ", " is the whole of the damage.
    const affected = await AppDataSource.manager
        .createQueryBuilder(TrimDetails, "details")
        .where("details.assistingSystems LIKE :suffix", {suffix: "%,%"})
        .getMany();

    console.log(`rows ending in a separator: ${affected.length}`);
    for (const details of affected) {
        console.log(`  ${details.id}: ${JSON.stringify(details.assistingSystems)}`);
    }

    for (const details of affected) {
        details.assistingSystems = details.assistingSystems.replace(/,[\s,]*$/, "").trimEnd();
        await AppDataSource.manager.save(details);
    }
    console.log(`updated ${affected.length}`);

    const remaining = await AppDataSource.manager
        .createQueryBuilder(TrimDetails, "details")
        .where("details.assistingSystems LIKE :suffix", {suffix: "%,%"})
        .getCount();
    console.log(`still ending in a separator: ${remaining}`);
} finally {
    await AppDataSource.destroy();
}