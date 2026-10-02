import {TrimDetails} from '../../../library/src/models';

/**
 * The canonical slug for a route segment. SlugifyPipe delegates here so the
 * template and the router cannot drift apart on how a name becomes a URL.
 */
export function slugify(input: string): string {
  return input.toString().toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w\-]+/g, '')
    .replace(/--+/g, '_')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function entitySlug(name: string, id: number): string {
  return slugify(name) + '-' + id;
}

/**
 * The production year of a date, or null when there isn't a usable one.
 *
 * An in-production row stores an invalid end date, which the API serialises as
 * null. A guard on the year also catches a year-zero sentinel, so both shapes
 * read as "still being built" instead of rendering 0000 or NaN.
 */
export function yearOf(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  const year = date.getUTCFullYear();
  return year > 0 ? year : null;
}

export function isInProduction(endYear: Date | string | null | undefined): boolean {
  return yearOf(endYear) === null;
}

/** "1994 – 2000", or "1965 – present" for a car still being built. */
export function yearRange(start: Date | string | null | undefined,
                          end: Date | string | null | undefined): string {
  const from = yearOf(start);
  const to = yearOf(end);
  if (from === null && to === null) return 'Years unknown';
  if (to === null) return from === null ? 'Present' : `${from} – present`;
  if (from === null) return `– ${to}`;
  return from === to ? `${from}` : `${from} – ${to}`;
}

/**
 * Spec labels, written out rather than derived from the field name, because
 * the names are the product's copy: "co2Emissions" is not a label anyone wants
 * to read. Keyed by TrimDetails field.
 */
const LABELS: Record<string, string> = {
  brand: 'Brand',
  model: 'Model',
  generation: 'Generation',
  modification: 'Modification',
  startOfProduction: 'Production start',
  endOfProduction: 'Production end',
  powertrainArchitecture: 'Powertrain',
  bodyType: 'Body',
  seats: 'Seats',
  doors: 'Doors',
  fuelConsumptionUrban: 'Fuel use, urban',
  fuelConsumptionExtraUrban: 'Fuel use, extra urban',
  fuelConsumptionCombined: 'Fuel use, combined',
  co2Emissions: 'CO2 emissions',
  fuelType: 'Fuel',
  acceleration0100: '0 to 100 km/h',
  acceleration062: '0 to 62 mph',
  acceleration060: '0 to 60 mph',
  maximumSpeed: 'Top speed',
  maximumEngineSpeed: 'Maximum engine speed',
  emissionStandard: 'Emission standard',
  weightToPowerRatio: 'Weight to power',
  weightToTorqueRatio: 'Weight to torque',
  power: 'Power',
  powerPerLitre: 'Power per litre',
  torque: 'Torque',
  engineLayout: 'Layout',
  engineModelCode: 'Engine code',
  engineDisplacement: 'Displacement',
  numberOfCylinders: 'Cylinders',
  engineConfiguration: 'Configuration',
  cylinderBore: 'Bore',
  pistonStroke: 'Stroke',
  compressionRatio: 'Compression ratio',
  valvesPerCylinder: 'Valves per cylinder',
  fuelInjectionSystem: 'Fuel injection',
  engineAspiration: 'Aspiration',
  valvetrain: 'Valvetrain',
  engineOilCapacity: 'Engine oil capacity',
  engineOilSpecification: 'Engine oil spec',
  coolantCapacity: 'Coolant capacity',
  kerbWeight: 'Kerb weight',
  maxWeight: 'Maximum weight',
  maxLoad: 'Maximum load',
  trunkSpaceMin: 'Boot space',
  fuelTankCapacity: 'Fuel tank',
  maxRoofLoad: 'Maximum roof load',
  permittedTrailerLoadWithBrakes: 'Trailer load, braked',
  permittedTrailerLoadWithoutBrakes: 'Trailer load, unbraked',
  permittedTowbarDownload: 'Towbar download',
  length: 'Length',
  width: 'Width',
  widthIncludingMirrors: 'Width over mirrors',
  height: 'Height',
  wheelbase: 'Wheelbase',
  frontTrack: 'Front track',
  rearTrack: 'Rear track',
  rideHeight: 'Ride height',
  dragCoefficient: 'Drag coefficient',
  minimumTurningCircle: 'Turning circle',
  driveWheel: 'Drive',
  gearbox: 'Gearbox',
  frontSuspension: 'Front suspension',
  rearSuspension: 'Rear suspension',
  frontBrakes: 'Front brakes',
  rearBrakes: 'Rear brakes',
  assistingSystems: 'Assisting systems',
  steeringType: 'Steering',
  powerSteering: 'Power steering',
  tiresSize: 'Tyre size',
  wheelRimsSize: 'Wheel size',
};

/**
 * Resolves the label for a details field, correcting the power field's unit:
 * the backend's label match for "power" catches "power per litre" first, so
 * that field is named for horsepower but usually holds a per-litre figure.
 * Labelling it from the value avoids repeating the wrong unit.
 */
export function detailsLabel(details: TrimDetails, key: keyof TrimDetails): string {
  if (key === 'power') {
    return /hp\s*\/\s*l/i.test(details.power ?? '') ? LABELS['powerPerLitre'] : LABELS['power'];
  }
  return LABELS[key as string] ?? String(key);
}

/** A recorded value. The source uses "?" where its own data is locked. */
export function hasValue(value: string | null | undefined): boolean {
  return value != null && value.trim() !== '' && value.trim() !== '?';
}

export interface SpecGroup {
  title: string;
  rows: { key: keyof TrimDetails; label: string; value: string; locked: boolean }[];
}

/**
 * The full record, grouped the way a spec sheet is read. Order within a group
 * follows the source, so a familiar car spec is in the familiar place.
 */
export function groupDetails(details: TrimDetails): SpecGroup[] {
  const groups: { title: string; keys: (keyof TrimDetails)[] }[] = [
    {
      title: 'General',
      keys: ['brand', 'model', 'generation', 'modification', 'startOfProduction',
        'endOfProduction', 'powertrainArchitecture', 'bodyType', 'seats', 'doors'],
    },
    {
      title: 'Performance',
      keys: ['acceleration0100', 'acceleration060', 'acceleration062', 'maximumSpeed',
        'maximumEngineSpeed', 'fuelConsumptionUrban', 'fuelConsumptionExtraUrban',
        'fuelConsumptionCombined', 'co2Emissions', 'fuelType', 'emissionStandard',
        'weightToPowerRatio', 'weightToTorqueRatio'],
    },
    {
      title: 'Engine',
      keys: ['power', 'powerPerLitre', 'torque', 'engineLayout', 'engineModelCode',
        'engineDisplacement', 'numberOfCylinders', 'engineConfiguration', 'cylinderBore',
        'pistonStroke', 'compressionRatio', 'valvesPerCylinder', 'fuelInjectionSystem',
        'engineAspiration', 'valvetrain', 'engineOilCapacity', 'engineOilSpecification',
        'coolantCapacity'],
    },
    {
      title: 'Weight and capacity',
      keys: ['kerbWeight', 'maxWeight', 'maxLoad', 'trunkSpaceMin', 'fuelTankCapacity',
        'maxRoofLoad', 'permittedTrailerLoadWithBrakes', 'permittedTrailerLoadWithoutBrakes',
        'permittedTowbarDownload'],
    },
    {
      title: 'Dimensions',
      keys: ['length', 'width', 'widthIncludingMirrors', 'height', 'wheelbase',
        'frontTrack', 'rearTrack', 'rideHeight', 'dragCoefficient', 'minimumTurningCircle'],
    },
    {
      title: 'Drivetrain and chassis',
      keys: ['driveWheel', 'gearbox', 'frontSuspension', 'rearSuspension', 'frontBrakes',
        'rearBrakes', 'assistingSystems', 'steeringType', 'powerSteering', 'tiresSize',
        'wheelRimsSize'],
    },
  ];

  return groups
    .map(({title, keys}) => {
      const rows = keys.map((key) => {
        const value = String(details[key] ?? '');
        return {
          key,
          label: detailsLabel(details, key),
          value,
          locked: value.trim() === '?',
        };
      });
      // powerPerLitre is never populated: the generic "power" match above it
      // claims every label containing "power". Drop the duplicate rather than
      // show two rows with the same figure under different units.
      const unique = rows.filter(
        (row) => !(row.key === 'powerPerLitre' && (row.value === '' || row.value === rows.find((r) => r.key === 'power')?.value)),
      );
      return {title, rows: unique};
    })
    .filter((group) => group.rows.length > 0);
}

/**
 * The five numbers that answer "what is this car, actually". Deliberately not
 * power: the trim name already states it, and the field behind it is unreliable.
 */
export function headlineFigures(details: TrimDetails): { label: string; value: string }[] {
  const figures = [
    {key: 'power' as keyof TrimDetails, label: detailsLabel(details, 'power')},
    {key: 'torque' as keyof TrimDetails, label: 'Torque'},
    {key: 'acceleration0100' as keyof TrimDetails, label: '0 to 100 km/h'},
    {key: 'maximumSpeed' as keyof TrimDetails, label: 'Top speed'},
    {key: 'fuelConsumptionCombined' as keyof TrimDetails, label: 'Fuel use, combined'},
  ];
  return figures
    .filter(({key}) => hasValue(details[key] as string))
    .map(({key, label}) => ({label, value: (details[key] ?? '') as string}));
}