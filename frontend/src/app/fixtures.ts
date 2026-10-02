import {Brand, Generation, Model, Trim, TrimDetails} from '../../../library/src/models';

/**
 * TEMPORARY fixture data so the UI can be built and reviewed without the
 * backend running. Values are lifted from the dev database, including its
 * rough edges, because those are what the layout has to survive:
 *
 *  - `power` holds a per-litre figure ("78.7 Hp/l"). The backend scraper's
 *    label match for "power" swallows "power per litre" first, so the field is
 *    named for horsepower but carries Hp/l. `labelFor()` sniffs the value.
 *  - Several fields are empty strings where the source page has no data.
 *  - `engineOilSpecification` is "?", the source site's paywall marker.
 *  - In-production models store an invalid end date, which the API emits as
 *    null rather than a year.
 *
 * ApiService reads from here while FIXTURES is on. Flip it off to go back to
 * HTTP and nothing else needs to change.
 */

/**
 * Stand-in artwork, generated inline.
 *
 * The real logos and photos are served from auto-data.net, which blocks
 * automated browsers outright, so a review build would show nothing. These
 * draw the same shapes at the same aspect ratios: a mark for a marque logo, a
 * landscape frame for a car photo. Revert LOGO and the plate() calls below to
 * go back to the real URLs.
 */
const plate = (label: string, hue: number, w = 600, h = 400) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue} 12% 26%)"/>` +
    `<stop offset="1" stop-color="hsl(${hue} 14% 14%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
    `<rect x="${w * 0.12}" y="${h * 0.6}" width="${w * 0.76}" height="${h * 0.14}" rx="${h * 0.07}" fill="hsl(${hue} 10% 42%)"/>` +
    `<circle cx="${w * 0.28}" cy="${h * 0.76}" r="${h * 0.09}" fill="hsl(${hue} 8% 24%)"/>` +
    `<circle cx="${w * 0.72}" cy="${h * 0.76}" r="${h * 0.09}" fill="hsl(${hue} 8% 24%)"/>` +
    `<text x="${w / 2}" y="${h * 0.38}" font-family="sans-serif" font-size="${h * 0.13}" ` +
    `fill="hsl(${hue} 10% 68%)" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/** A badge-shaped mark with the marque initial, legible at header size. */
const logoPlate = (name: string) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">` +
    `<rect width="120" height="120" rx="24" fill="#e9edf3"/>` +
    `<text x="60" y="82" font-family="sans-serif" font-weight="700" font-size="62" ` +
    `fill="#121820" text-anchor="middle">${name[0]}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const UPDATED = '2026-10-02T06:33:28.000Z';

const year = (y: number) => `${y}-01-01T05:00:00.000Z`;

const brand = (id: number, name: string): Brand => ({
  id,
  name,
  url: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-brand-${id}`,
  updatedAt: new Date(UPDATED),
  imageUrl: logoPlate(name),
  models: [],
});

const BRANDS: Brand[] = [
  brand(1, '212'),
  brand(3, 'AC'),
  brand(8, 'AITO'),
  brand(9, 'Aiways'),
  brand(10, 'Aixam'),
  brand(11, 'Alfa Romeo'),
  brand(12, 'Alpina'),
  brand(13, 'Alpine'),
  brand(17, 'Arcfox'),
  brand(19, 'Ariel'),
  brand(24, 'Aston Martin'),
  brand(26, 'Audi'),
  brand(28, 'Aurus'),
  brand(30, 'Austin-Healey'),
  brand(31, 'Autobianchi'),
  brand(33, 'B.Engineering'),
  brand(34, 'BAC'),
  brand(36, 'Baltasar'),
  brand(38, 'Baojun'),
  brand(42, 'Bentley'),
  brand(46, 'Bitter'),
  brand(47, 'Bizzarrini'),
  brand(49, 'BMW'),
  brand(50, 'Bollinger'),
  brand(52, 'Borgward'),
  brand(53, 'Brabham'),
  brand(55, 'Brilliance'),
  brand(58, 'Bugatti'),
  brand(59, 'Buick'),
  brand(63, 'Cadillac'),
  brand(66, 'Caterham'),
  brand(70, 'Chevrolet'),
  brand(76, 'Chrysler'),
  brand(80, 'Citroen'),
  brand(84, 'Cupra'),
  brand(88, 'Dacia'),
  brand(92, 'Daewoo'),
  brand(95, 'Daihatsu'),
  brand(98, 'Datsun'),
  brand(101, 'Dodge'),
  brand(105, 'DS'),
  brand(110, 'Ferrari'),
  brand(114, 'Fiat'),
  brand(118, 'Ford'),
  brand(124, 'Ghia'),
  brand(128, 'GMC'),
  brand(131, 'Hafei'),
  brand(136, 'Holden'),
  brand(140, 'Honda'),
  brand(145, 'Hummer'),
  brand(149, 'Hyundai'),
  brand(153, 'Infiniti'),
  brand(158, 'Isuzu'),
  brand(162, 'Jaguar'),
  brand(167, 'Jeep'),
  brand(171, 'Kia'),
  brand(175, 'Koenigsegg'),
  brand(179, 'Lada'),
  brand(183, 'Lamborghini'),
  brand(188, 'Lancia'),
  brand(192, 'Land Rover'),
  brand(196, 'Lexus'),
  brand(200, 'Ligier'),
  brand(203, 'Lincoln'),
  brand(206, 'Lotus'),
  brand(210, 'Mahindra'),
  brand(214, 'Maserati'),
  brand(218, 'Mazda'),
  brand(222, 'McLaren'),
  brand(226, 'Mercedes-Benz'),
  brand(230, 'Mini'),
  brand(234, 'Mitsubishi'),
  brand(238, 'Nissan'),
  brand(242, 'Opel'),
  brand(246, 'Peugeot'),
  brand(250, 'Polestar'),
  brand(254, 'Porsche'),
  brand(258, 'Renault'),
  brand(262, 'Rolls-Royce'),
  brand(266, 'Saab'),
  brand(270, 'Seat'),
  brand(274, 'Skoda'),
  brand(278, 'Smart'),
  brand(282, 'SsangYong'),
  brand(286, 'Subaru'),
  brand(290, 'Suzuki'),
  brand(294, 'Tesla'),
  brand(298, 'Toyota'),
  brand(302, 'Volkswagen'),
  brand(306, 'Volvo'),
  brand(310, 'Xpeng'),
  brand(314, 'ZAZ'),
];

const model = (
  id: number,
  name: string,
  startYear: number,
  endYear: number | null,
  imageUrl: string,
): Model => ({
  id,
  name,
  url: `model-${id}`,
  updatedAt: new Date(UPDATED),
  startYear: new Date(year(startYear)),
  // The API emits null for an in-production row, not a sentinel date.
  endYear: endYear === null ? (null as never) : new Date(year(endYear)),
  imageUrl,
  brand: undefined as never,
  generations: [],
});

/** Marks a model still in production. */
const current = null;

const ALFA_MODELS: Model[] = [
  model(122, 'GT', 1963, 2010, plate('GT', 210)),
  model(120, 'Giulia', 1965, current, plate('Giulia', 12)),
  model(129, 'Spider', 1966, 2010, plate('Spider', 268)),
  model(109, '33', 1967, 1994, plate('33', 32)),
  model(123, 'GTA Coupe', 1968, 1976, plate('GTA Coupe', 348)),
  model(127, 'Montreal', 1970, 1977, plate('Montreal', 96)),
  model(116, 'Alfasud', 1972, 1989, plate('Alfasud', 168)),
  model(117, 'Alfetta', 1974, 1986, plate('Alfetta', 300)),
  model(121, 'Giulietta', 1977, 2020, plate('Giulietta', 44)),
  model(124, 'GTV', 1978, 2004, plate('GTV', 228)),
  model(112, '6', 1979, 1988, plate('6', 132)),
  model(118, 'Arna', 1983, 1986, plate('Arna', 316)),
  model(115, '90', 1984, 1987, plate('90', 76)),
  model(100, '145', 1994, 2000, plate('145', 4)),
];

const generation = (
  id: number,
  name: string,
  chassisType: string,
  startYear: number,
  endYear: number,
): Generation => ({
  id,
  name,
  url: `generation-${id}`,
  updatedAt: new Date(UPDATED),
  chassisType,
  startYear: new Date(year(startYear)),
  endYear: new Date(year(endYear)),
  imageUrl: plate('145 930', 204),
  model: undefined as never,
  trims: [],
});

const G_145_GENERATIONS: Generation[] = [
  generation(1, 'Alfa Romeo 145 (930, facelift 1999)', 'Hatchback', 1999, 2000),
  generation(2, 'Alfa Romeo 145 (930, facelift 1997)', 'Hatchback', 1997, 1999),
  generation(3, 'Alfa Romeo 145 (930)', 'Hatchback', 1994, 1996),
];

const TRIM_IMAGES = [
  plate('Quadrifoglio', 8, 800, 500),
  plate('Quadrifoglio', 26, 800, 500),
  plate('Quadrifoglio', 44, 800, 500),
  plate('Quadrifoglio', 8, 800, 500),
  plate('Quadrifoglio', 26, 800, 500),
  plate('Quadrifoglio', 44, 800, 500),
];

const trim = (id: number, name: string, startYear: number, endYear: number): Trim => ({
  id,
  name,
  url: `trim-${id}`,
  updatedAt: new Date(UPDATED),
  startYear: new Date(year(startYear)),
  endYear: new Date(year(endYear)),
  imageUrls: TRIM_IMAGES,
  generation: undefined as never,
  trimDetails: undefined as never,
});

const G1_TRIMS: Trim[] = [
  trim(1, '2.0 Twin Spark Quadrifoglio (155 Hp)', 1999, 2000),
  trim(2, '1.9 JTD (105 Hp)', 1999, 2000),
  trim(3, '1.8 Twin Spark 16V (144 Hp)', 1999, 2000),
  trim(4, '1.6 Twin Spark 16V (120 Hp)', 1999, 2000),
  trim(5, '1.4 Twin Spark 16V (103 Hp)', 1999, 2000),
];

/** Full scraped record for trim 1, empty strings included on purpose. */
const TRIM_1_DETAILS: TrimDetails = {
  id: 1,
  name: '2.0 Twin Spark Quadrifoglio (155 Hp)',
  url: 'alfa-romeo-145-930-facelift-1999-2.0-twin-spark-quadrifoglio-155hp-41204',
  updatedAt: new Date(UPDATED),
  brand: 'Alfa Romeo',
  model: '145',
  generation: '145 (930, facelift 1999)',
  modification: '2.0 Twin Spark Quadrifoglio (155 Hp)',
  startOfProduction: '1999',
  endOfProduction: '2000',
  powertrainArchitecture: 'Internal Combustion engine',
  bodyType: 'Hatchback',
  seats: '5',
  doors: '3',
  fuelConsumptionUrban: '12.5 l/100 km',
  fuelConsumptionExtraUrban: '6.6 l/100 km',
  fuelConsumptionCombined: '8.7 l/100 km',
  co2Emissions: '210 g/km',
  fuelType: 'Petrol (Gasoline)',
  acceleration0100: '8.3 sec',
  acceleration062: '8.3 sec',
  acceleration060: '7.9 sec',
  maximumSpeed: '211 km/h',
  maximumEngineSpeed: '',
  emissionStandard: 'Euro 2',
  weightToPowerRatio: '8 kg/Hp, 125 Hp/tonne',
  weightToTorqueRatio: '6.6 kg/Nm, 150.8 Nm/tonne',
  power: '78.7 Hp/l',
  powerPerLitre: '',
  torque: '187 Nm @ 3500 rpm.',
  engineLayout: 'Front, Transverse',
  engineModelCode: 'AR 32301',
  engineDisplacement: '1970 cm',
  numberOfCylinders: '4',
  engineConfiguration: 'Inline',
  cylinderBore: '83 mm',
  pistonStroke: '91 mm',
  compressionRatio: '10:1',
  valvesPerCylinder: '4',
  fuelInjectionSystem: 'Multi-port manifold injection',
  engineAspiration: 'Naturally aspirated engine',
  valvetrain: 'DOHC',
  engineOilCapacity: '4.4 l',
  engineOilSpecification: '?',
  coolantCapacity: '8.3 l',
  kerbWeight: '1240 kg',
  maxWeight: '1765 kg',
  maxLoad: '525 kg',
  trunkSpaceMin: '1130 l',
  fuelTankCapacity: '51 l',
  maxRoofLoad: '',
  permittedTrailerLoadWithBrakes: '1200 kg',
  permittedTrailerLoadWithoutBrakes: '350 kg',
  permittedTowbarDownload: '50 kg',
  length: '4061 mm',
  width: '1712 mm',
  widthIncludingMirrors: '',
  height: '1431 mm',
  wheelbase: '2540 mm',
  frontTrack: '1468 mm',
  rearTrack: '1441 mm',
  rideHeight: '',
  dragCoefficient: '',
  minimumTurningCircle: '10.5 m',
  driveWheel: 'Front wheel drive',
  gearbox: '5 gears, manual transmission',
  frontSuspension: 'Independent, McPherson type, Anti-roll bar',
  rearSuspension: 'Anti-roll bar, Trailing arm, Coil spring',
  frontBrakes: 'Disc, 284x21.8 mm',
  rearBrakes: 'Drum, 228.7 mm',
  assistingSystems: 'ABS (Anti-lock braking system)',
  steeringType: '',
  powerSteering: '',
  tiresSize: '195/55 R 15',
  wheelRimsSize: '6 J x 15',
};

const dieselDetails = (id: number, modification: string): TrimDetails => ({
  ...TRIM_1_DETAILS,
  id,
  modification,
  name: modification,
  power: '55.1 Hp/l',
  torque: '290 Nm @ 3900 rpm.',
  acceleration0100: '11.5 sec',
  acceleration060: '11 sec',
  maximumSpeed: '187 km/h',
  fuelConsumptionUrban: '7.2 l/100 km',
  fuelConsumptionExtraUrban: '4.4 l/100 km',
  fuelConsumptionCombined: '5.4 l/100 km',
  co2Emissions: '145 g/km',
  fuelType: 'Diesel',
  emissionStandard: 'Euro 2',
  engineModelCode: 'AR 32303',
  engineConfiguration: 'Inline',
  numberOfCylinders: '4',
  fuelInjectionSystem: 'Direct injection',
  engineOilSpecification: '5W-40',
});

export const FIXTURES = {
  getAllBrands(): Brand[] {
    return BRANDS.map((b) => ({ ...b }));
  },

  getBrandWithModels(brandId: number): Brand {
    const found = BRANDS.find((b) => b.id === brandId) ?? BRANDS[10];
    const models =
      found.id === 11 ? ALFA_MODELS.map((m) => ({ ...m })) : ([
        model(900 + found.id, 'Model A', 1990, 2000, plate('Model A', 18)),
        model(950 + found.id, 'Model B', 2004, current, plate('Model B', 190)),
      ] as Model[]);
    return {...found, models};
  },

  getModelWithGenerations(modelId: number): Model {
    const found = ALFA_MODELS.find((m) => m.id === modelId) ?? ALFA_MODELS[13];
    const parent = BRANDS.find((b) => b.id === 11) ?? BRANDS[0];
    // The real endpoint loads relations for generations *and* brand, so the
    // model arrives with its marque attached. The header path relies on it.
    return {
      ...found,
      brand: {...parent, models: []},
      generations: G_145_GENERATIONS.map((g) => ({...g})),
    };
  },

  getGenerationWithTrims(generationId: number): Generation {
    const found = G_145_GENERATIONS.find((g) => g.id === generationId) ?? G_145_GENERATIONS[0];
    return {...found, trims: G1_TRIMS.map((t) => ({ ...t }))};
  },

  getTrimDetails(trimId: number): Trim {
    const found = G1_TRIMS.find((t) => t.id === trimId) ?? G1_TRIMS[0];
    const details =
      found.id === 2
        ? dieselDetails(2, '1.9 JTD (105 Hp)')
        : {...TRIM_1_DETAILS, id: found.id, name: found.name, modification: found.name};
    // The real endpoint loads relations for generation too. Without it a direct
    // load of a trim URL has no parent to name in the header path.
    const generation = G_145_GENERATIONS.find((g) => g.id === 1) ?? G_145_GENERATIONS[0];
    const parent = ALFA_MODELS.find((m) => m.id === 100) ?? ALFA_MODELS[13];
    return {
      ...found,
      generation: {...generation, trims: [], model: {...parent, generations: []}},
      trimDetails: details,
    };
  },
};