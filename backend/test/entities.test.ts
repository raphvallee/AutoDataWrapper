import {describe, expect, test} from "./harness";
import {getMetadataArgsStorage} from "typeorm";

import {Brand, EntityBase, Generation, Model, Trim, TrimDetails} from "../src/entity/entities";

/**
 * The entity classes are the schema contract: `synchronize: true` builds the
 * tables from these decorators on every start. A default that silently changes
 * turns into a column default, so the defaults are pinned here.
 */
describe("entities", () => {
    test("every entity inherits id, name, url and updatedAt from EntityBase", () => {
        for (const Entity of [Brand, Model, Generation, Trim, TrimDetails]) {
            const instance = new Entity() as EntityBase;
            expect(instance.name).toBe("");
            expect(instance.url).toBe("");
            expect(instance.id).toBeUndefined();
            expect(instance.updatedAt).toBeUndefined();
            expect(Object.getPrototypeOf(Entity)).toBe(EntityBase);
        }
    });

    test("EntityBase is abstract, so it is never registered as a table", () => {
        const targets = getMetadataArgsStorage().tables.map((table) => table.target);
        expect(targets).toContain(Brand);
        expect(targets).toContain(Model);
        expect(targets).toContain(Generation);
        expect(targets).toContain(Trim);
        expect(targets).toContain(TrimDetails);
        expect(targets).not.toContain(EntityBase);
    });

    test("Brand defaults to no image and no models", () => {
        const brand = new Brand();
        expect(brand.imageUrl).toBeUndefined();
        expect(brand.models).toBeUndefined();
    });

    test("Model starts life in the current year, without a brand", () => {
        const model = new Model();
        expect(model.startYear).toBeInstanceOf(Date);
        expect(model.endYear).toBeInstanceOf(Date);
        expect(model.imageUrl).toBe("");
        expect(model.brand).toBeUndefined();
        expect(model.generations).toBeUndefined();
    });

    test("Generation defaults its chassis, years and image", () => {
        const generation = new Generation();
        expect(generation.chassisType).toBe("");
        expect(generation.startYear).toBeInstanceOf(Date);
        expect(generation.endYear).toBeInstanceOf(Date);
        expect(generation.imageUrl).toBe("");
        expect(generation.model).toBeUndefined();
        expect(generation.trims).toBeUndefined();
    });

    test("Trim stores its gallery images as an array", () => {
        const trim = new Trim();
        expect(trim.imageUrls).toEqual([]);
        expect(trim.generation).toBeUndefined();
        expect(trim.trimDetails).toBeUndefined();
    });

    test("TrimDetails starts with every scraped field blank", () => {
        const details = new TrimDetails();
        const blanks = Object.entries(details).filter(([, value]) => value === "");

        // Every column declared on the class, plus the name and url inherited
        // from EntityBase. A declared column missing its initialiser would
        // come out undefined and silently become NOT NULL-less on insert.
        const declaredColumns = getMetadataArgsStorage().columns.filter(
            (column) => column.target === TrimDetails
        );
        expect(blanks).toHaveLength(declaredColumns.length + 2);
        expect(declaredColumns.length).toBe(71);

        expect(details.brand).toBe("");
        expect(details.power).toBe("");
        expect(details.assistingSystems).toBe("");
        expect(details.wheelRimsSize).toBe("");
    });

    test("relations are registered with the cascade that deletes children", () => {
        const relations = getMetadataArgsStorage()
            .relations.map((relation) => ({
                name: relation.propertyName,
                onDelete: relation.options.onDelete as string | undefined,
            }));

        expect(relations).toContainEqual({name: "models", onDelete: "CASCADE"});
        expect(relations).toContainEqual({name: "generations", onDelete: "CASCADE"});
        expect(relations).toContainEqual({name: "trims", onDelete: "CASCADE"});
        expect(relations).toContainEqual({name: "trimDetails", onDelete: "CASCADE"});
        // The many-to-one parents have no delete rule: deleting a model must
        // not silently take its brand with it.
        expect(relations).toContainEqual({name: "brand", onDelete: undefined});
        expect(relations).toContainEqual({name: "model", onDelete: undefined});
        expect(relations).toContainEqual({name: "generation", onDelete: undefined});
    });

    test("the image gallery is persisted as a simple-array column", () => {
        const column = getMetadataArgsStorage().columns.find(
            (candidate) => candidate.propertyName === "imageUrls"
        );
        expect(column?.options?.type).toBe("simple-array");
    });
});