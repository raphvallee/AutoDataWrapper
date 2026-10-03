export interface Brand {
    id: number;
    name: string;
    url: string;
    updatedAt: Date;
    imageUrl?: string;
    // Optional because only /brand/:id loads them; /brands returns the marques
    // alone.
    models?: Model[];
}

export interface Model {
    id: number;
    name: string;
    url: string;
    updatedAt: Date;
    // Nullable because the source has no end date for a car still in production,
    // and the scraper stores an unparseable value that the API serialises as
    // null rather than a sentinel date. `format.yearOf` reads both shapes.
    startYear: Date | null;
    endYear: Date | null;
    imageUrl: string;
    // Optional: an endpoint loads the brand only when the page above it needs
    // one to name, which is /model/:id and the deep-link pages below it.
    brand?: Brand;
    generations?: Generation[];
}

export interface Generation {
    id: number;
    name: string;
    url: string;
    updatedAt: Date;
    chassisType: string;
    startYear: Date | null;
    endYear: Date | null;
    imageUrl: string;
    model?: Model;
    trims?: Trim[];
}

export interface TrimDetails {
    id: number;
    name: string;
    url: string;
    updatedAt: Date;
    // General information
    brand: string;
    model: string;
    generation: string;
    modification: string;
    startOfProduction: string;
    endOfProduction: string;
    powertrainArchitecture: string;
    bodyType: string;
    seats: string;
    doors: string;
    // Performance specs
    fuelConsumptionUrban: string;
    fuelConsumptionExtraUrban: string;
    fuelConsumptionCombined: string;
    co2Emissions: string;
    fuelType: string;
    acceleration0100: string;
    acceleration062: string;
    acceleration060: string;
    maximumSpeed: string;
    maximumEngineSpeed: string;
    emissionStandard: string;
    weightToPowerRatio: string;
    weightToTorqueRatio: string;
    // Engine specs
    power: string;
    powerPerLitre: string;
    torque: string;
    engineLayout: string;
    engineModelCode: string;
    engineDisplacement: string;
    numberOfCylinders: string;
    engineConfiguration: string;
    cylinderBore: string;
    pistonStroke: string;
    compressionRatio: string;
    valvesPerCylinder: string;
    fuelInjectionSystem: string;
    engineAspiration: string;
    valvetrain: string;
    engineOilCapacity: string;
    engineOilSpecification: string;
    coolantCapacity: string;
    // Space, Volume and weights
    kerbWeight: string;
    maxWeight: string;
    maxLoad: string;
    trunkSpaceMin: string;
    fuelTankCapacity: string;
    maxRoofLoad: string;
    permittedTrailerLoadWithBrakes: string;
    permittedTrailerLoadWithoutBrakes: string;
    permittedTowbarDownload: string;
    // Dimensions
    length: string;
    width: string;
    widthIncludingMirrors: string;
    height: string;
    wheelbase: string;
    frontTrack: string;
    rearTrack: string;
    rideHeight: string;
    dragCoefficient: string;
    minimumTurningCircle: string;
    // Drivetrain, brakes and suspension
    driveWheel: string;
    gearbox: string;
    frontSuspension: string;
    rearSuspension: string;
    frontBrakes: string;
    rearBrakes: string;
    assistingSystems: string;
    steeringType: string;
    powerSteering: string;
    tiresSize: string;
    wheelRimsSize: string;
}

export interface Trim {
    id: number;
    name: string;
    url: string;
    updatedAt: Date;
    // Nullable for the same reason as Model: an open-ended production run.
    startYear: Date | null;
    endYear: Date | null;
    imageUrls: string[];
    generation?: Generation;
    // Optional: /trim/:id loads the scraped record, but only once the scraper
    // has run for this trim. Until then the endpoint returns it as null and the
    // page shows the summary without a spec sheet.
    trimDetails?: TrimDetails | null;
}