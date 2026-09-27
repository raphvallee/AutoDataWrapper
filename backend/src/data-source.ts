import {DataSource} from "typeorm";
import {Brand, Generation, Model, Trim, TrimDetails} from "./entity/entities";

// Entities are listed explicitly rather than via a glob. A glob like
// "src/entity/*.ts" only resolves under ts-node; running the compiled
// output (npm start -> node dist/index.js) made TypeORM load raw
// TypeScript and crash on the first decorator.
export const AppDataSource = new DataSource({
    type: "better-sqlite3",
    database: "db.sqlite",
    logging: false,
    synchronize: true, // ONLY FOR DEV, will scrap db each restart
    entities: [Brand, Model, Generation, Trim, TrimDetails],
    subscribers: [],
    migrations: [],
})