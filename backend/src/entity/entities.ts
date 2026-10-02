import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn
} from "typeorm";

//TODO TRY EntityBaseWithDate extends EntiyBase, for startYear & endYear
//
// Coverage note: every field below typed with a class rather than a primitive
// (Date, or another entity) makes oxc's decorator transform emit
//     _decorateMetadata("design:type", typeof Date === "undefined" ? Object : Date)
// on that field's decorator line. TypeORM needs the metadata, but the guard's
// true arm cannot be reached - the class is imported and initialised before the
// decorator runs. Each of those ten decorators therefore carries one branch no
// test can cover, which is what the `v8 ignore` hints below them are for. The
// range form is required: the hint has to span the decorator line, because the
// ternary is attributed to a column inside it rather than to the statement.
// Primitively typed fields need no hint because they emit no ternary.
export abstract class EntityBase {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name: string = "";

    @Column()
    url: string = "";

    /* v8 ignore start -- design:type ternary emitted by the transform, see note above */
    @CreateDateColumn()
    /* v8 ignore stop */
    updatedAt!: Date;
}

@Entity()
export class Brand extends EntityBase {

    @Column({nullable: true})
    imageUrl?: string;

    @OneToMany(() => Model, (model) => model.brand, {onDelete: "CASCADE"})
    models!: Model[]
}

@Entity()
export class Model extends EntityBase {

    /* v8 ignore start -- design:type ternary emitted by the transform, see note above */
    @Column()
    /* v8 ignore stop */
    startYear: Date = new Date();

    /* v8 ignore start -- design:type ternary emitted by the transform, see note above */
    @Column()
    /* v8 ignore stop */
    endYear: Date = new Date();

    @Column()
    imageUrl: string = "";

    /* v8 ignore start -- design:type ternary emitted by the transform, see note above */
    @ManyToOne(() => Brand, (brand) => brand.models)
    /* v8 ignore stop */
    brand!: Brand;

    @OneToMany(() => Generation, (generation) => generation.model, {onDelete: "CASCADE"})
    generations!: Generation[]
}

@Entity()
export class Generation extends EntityBase {

    @Column()
    chassisType: string = "";

    /* v8 ignore start -- design:type ternary emitted by the transform, see note above */
    @Column()
    /* v8 ignore stop */
    startYear: Date = new Date();

    /* v8 ignore start -- design:type ternary emitted by the transform, see note above */
    @Column()
    /* v8 ignore stop */
    endYear: Date = new Date();

    @Column()
    imageUrl: string = "";

    /* v8 ignore start -- design:type ternary emitted by the transform, see note above */
    @ManyToOne(() => Model, (model) => model.generations)
    /* v8 ignore stop */
    model!: Model;

    @OneToMany(() => Trim, (trim) => trim.generation, {onDelete: "CASCADE"})
    trims!: Trim[];
}

@Entity()
export class TrimDetails extends EntityBase {

    // General information
    @Column()
    brand: string = "";

    @Column()
    model: string = "";

    @Column()
    generation: string = "";

    @Column()
    modification: string = "";

    @Column()
    startOfProduction: string = "";

    @Column()
    endOfProduction: string = "";

    @Column()
    powertrainArchitecture: string = "";

    @Column()
    bodyType: string = "";

    @Column()
    seats: string = "";

    @Column()
    doors: string = "";

    // Performance specs
    @Column()
    fuelConsumptionUrban: string = "";

    @Column()
    fuelConsumptionExtraUrban: string = "";

    @Column()
    fuelConsumptionCombined: string = "";

    @Column()
    co2Emissions: string = "";

    @Column()
    fuelType: string = "";

    @Column()
    acceleration0100: string = "";

    @Column()
    acceleration062: string = "";

    @Column()
    acceleration060: string = "";

    @Column()
    maximumSpeed: string = "";

    @Column()
    maximumEngineSpeed: string = "";

    @Column()
    emissionStandard: string = "";

    @Column()
    weightToPowerRatio: string = "";

    @Column()
    weightToTorqueRatio: string = "";

    // Engine specs
    @Column()
    power: string = "";

    @Column()
    powerPerLitre: string = "";

    @Column()
    torque: string = "";

    @Column()
    engineLayout: string = "";

    @Column()
    engineModelCode: string = "";

    @Column()
    engineDisplacement: string = "";

    @Column()
    numberOfCylinders: string = "";

    @Column()
    engineConfiguration: string = "";

    @Column()
    cylinderBore: string = "";

    @Column()
    pistonStroke: string = "";

    @Column()
    compressionRatio: string = "";

    @Column()
    valvesPerCylinder: string = "";

    @Column()
    fuelInjectionSystem: string = "";

    @Column()
    engineAspiration: string = "";

    @Column()
    valvetrain: string = "";

    @Column()
    engineOilCapacity: string = "";

    @Column()
    engineOilSpecification: string = "";

    @Column()
    coolantCapacity: string = "";

    // Space, Volume and weights
    @Column()
    kerbWeight: string = "";

    @Column()
    maxWeight: string = "";

    @Column()
    maxLoad: string = "";

    @Column()
    trunkSpaceMin: string = "";

    @Column()
    fuelTankCapacity: string = "";

    @Column()
    maxRoofLoad: string = "";

    @Column()
    permittedTrailerLoadWithBrakes: string = "";

    @Column()
    permittedTrailerLoadWithoutBrakes: string = "";

    @Column()
    permittedTowbarDownload: string = "";

    // Dimensions
    @Column()
    length: string = "";

    @Column()
    width: string = "";

    @Column()
    widthIncludingMirrors: string = "";

    @Column()
    height: string = "";

    @Column()
    wheelbase: string = "";

    @Column()
    frontTrack: string = "";

    @Column()
    rearTrack: string = "";

    @Column()
    rideHeight: string = "";

    @Column()
    dragCoefficient: string = "";

    @Column()
    minimumTurningCircle: string = "";

    // Drivetrain, brakes and suspension
    @Column()
    driveWheel: string = "";

    @Column()
    gearbox: string = "";

    @Column()
    frontSuspension: string = "";

    @Column()
    rearSuspension: string = "";

    @Column()
    frontBrakes: string = "";

    @Column()
    rearBrakes: string = "";

    @Column()
    assistingSystems: string = "";

    @Column()
    steeringType: string = "";

    @Column()
    powerSteering: string = "";

    @Column()
    tiresSize: string = "";

    @Column()
    wheelRimsSize: string = "";
}

@Entity()
export class Trim extends EntityBase {

    /* v8 ignore start -- design:type ternary emitted by the transform, see note above */
    @Column()
    /* v8 ignore stop */
    startYear: Date = new Date();

    /* v8 ignore start -- design:type ternary emitted by the transform, see note above */
    @Column()
    /* v8 ignore stop */
    endYear: Date = new Date();

    @Column("simple-array")
    imageUrls: string[] = [];

    /* v8 ignore start -- design:type ternary emitted by the transform, see note above */
    @ManyToOne(() => Generation, (generation) => generation.trims)
    /* v8 ignore stop */
    generation!: Generation;

    @OneToOne(() => TrimDetails, {onDelete: "CASCADE"})
    @JoinColumn()
    trimDetails!: TrimDetails;
}
