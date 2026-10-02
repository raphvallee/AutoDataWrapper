import "reflect-metadata"
import {ScraperEngine} from './ScraperEngine';
import {Brand, Generation, Model, Trim, TrimDetails} from "../entity/entities";
import {AppDataSource} from "../data-source";

export class FetchProvider {

    private scraper: ScraperEngine;

    constructor() {
        this.scraper = new ScraperEngine({
            headless: true,
            timeout: 60000,
        });
    }

    //#region Service methods
    async getBrands(): Promise<Brand[]> {
        let brands: Brand[] = [];
        try {
            brands = await this.getStoredBrands();
            if (brands.length == 0) {
                const scrapedData = await this.scrapeBrands();
                let tempBrands: Brand[] = [];
                scrapedData.forEach((item: any) => {
                    let brand: Brand = new Brand();
                    brand.name = item.name;
                    brand.url = item.url;
                    brand.imageUrl = item.imageUrl;
                    tempBrands.push(brand);
                })
                await AppDataSource.manager.insert(Brand, tempBrands);
                await AppDataSource.manager.save(tempBrands);
                brands = tempBrands;
            }
        } catch (e) {
            console.log(e);
        } finally {
            await this.scraper.close();
        }
        return brands;
    }

    async getBrandWithModels(brandId: number): Promise<Brand | null> {
        let brand: Brand | null = null;
        try {
            brand = await this.getStoredBrandWithModels(brandId);
            if (brand == null) {
                return null;
            } else if (brand.models == null || brand.models.length == 0) {
                const scrapedData = await this.scrapeModelsByBrandUrl(brand.url);
                let models: Model[] = [];
                scrapedData.forEach((item: any) => {
                    let model: Model = new Model();
                    model.name = item.name;
                    model.url = item.url;
                    model.startYear = item.startYear;
                    model.endYear = item.endYear;
                    model.imageUrl = item.imageUrl;
                    model.brand = brand!;
                    models.push(model);
                })
                await AppDataSource.manager.insert(Model, models);
                await AppDataSource.manager.save(models);
                brand = await this.getStoredBrandWithModels(brandId);
            }
        } catch (e) {
            console.log(e);
        } finally {
            await this.scraper.close();
        }
        return brand;
    }

    async getModelWithGenerations(modelId: number): Promise<Model | null> {
        let model: Model | null = null;
        try {
            model = await this.getStoredModelWithGenerations(modelId);
            if (model == null) {
                return null;
            } else if (model.generations == null || model.generations.length == 0) {
                const scrapedData = await this.scrapeGenerationsByModelUrl(model.url);
                let generations: Generation[] = [];
                scrapedData.forEach((item: any) => {
                    let generation: Generation = new Generation();
                    generation.name = item.name;
                    generation.url = item.url;
                    generation.startYear = item.startYear;
                    generation.endYear = item.endYear;
                    generation.chassisType = item.chassisType;
                    generation.imageUrl = item.imageUrl;
                    generation.model = model!;
                    generations.push(generation);
                })
                await AppDataSource.manager.insert(Generation, generations);
                await AppDataSource.manager.save(generations);
                model = await this.getStoredModelWithGenerations(modelId);
            }
        } catch (e) {
            console.log(e);
        } finally {
            await this.scraper.close();
        }
        return model;
    }

    async getGenerationWithTrims(generationId: number): Promise<Generation | null> {
        let generation: Generation | null = null;
        try {
            generation = await this.getStoredGenerationWithTrims(generationId);
            if (generation == null) {
                return null;
            } else if (generation.trims == null || generation.trims.length == 0) {
                const scrapedData = await this.scrapeTrimsByGenerationUrl(generation.url);
                let trims: Trim[] = [];
                scrapedData.forEach((item: any) => {
                    let trim: Trim = new Trim();
                    trim.name = item.name;
                    trim.url = item.url;
                    trim.startYear = item.startYear;
                    trim.endYear = item.endYear;
                    trim.imageUrls = item.imageUrls
                    trim.generation = generation!;
                    trims.push(trim);
                })
                await AppDataSource.manager.insert(Trim, trims);
                await AppDataSource.manager.save(trims);
                generation = await this.getStoredGenerationWithTrims(generationId);
            }
        } catch (e) {
            console.log(e);
        } finally {
            await this.scraper.close();
        }
        return generation;
    }

    async getTrimWithDetails(trimId: number): Promise<Trim | null> {
        let trim: Trim | null = null;
        try {
            trim = await this.getStoredTrimWithTrimDetails(trimId);
            if (trim == null) {
                return null;
            } else if (trim.trimDetails == null) {
                const trimDetailsScraped: any = await this.scrapeTrimDetailsByTrimUrl(trim.url);
                const trimDetails: TrimDetails = Object.assign(new TrimDetails(), trimDetailsScraped) as TrimDetails;

                trim.trimDetails = trimDetails;

                await AppDataSource.manager.insert(TrimDetails, trimDetails);
                await AppDataSource.manager.save(trimDetails);
                // save() alone writes the trimDetailsId foreign key. An insert()
                // here re-inserts the trim row that already exists and dies on
                // the primary key, which aborted this method before the link was
                // ever written - every request then rescraped and left another
                // orphaned trim_details row behind.
                await AppDataSource.manager.save(trim);
                trim = await this.getStoredTrimWithTrimDetails(trimId);
            }
        } catch (e) {
            console.log(e);
        } finally {
            await this.scraper.close();
        }
        return trim;
    }

    //#endregion

    //#region Stored methods
    private async getStoredBrands(): Promise<Brand[]> {
        const brands = await AppDataSource.manager.find(Brand);
        // Unreachable fallback: find() returns an empty array, never null.
        /* v8 ignore next -- find() is typed Promise<Entity[]> and never returns null */
        return brands || [];
    }

    private async getStoredBrandWithModels(brandId: number): Promise<Brand | null> {
        const brand = await AppDataSource.manager.findOne(Brand, {
            where: {
                id: brandId,
            },
            relations: {
                models: true,
            },
        });
        if (brand == null) {
            console.warn(`getStoredModelsByBrandId: brandId:${brandId} not found`);
            return null;
        }
        return brand;
    }

    private async getStoredModelWithGenerations(modelId: number): Promise<Model | null> {
        const model = await AppDataSource.manager.findOne(Model, {
            where: {
                id: modelId,
            },
            relations: {
                generations: true,
                brand: true,
            },
        });

        if (model == null) {
            console.warn(`getStoredModelWithGenerations: No Model for modelId:${modelId}`);
            return null;
        } else if (model.brand == null) {
            console.warn(`getStoredModelWithGenerations: No Brand for modelId:${modelId}`);
            return null;
        }

        return model;
    }

    private async getStoredGenerationWithTrims(generationId: number): Promise<Generation | null> {
        const generation = await AppDataSource.manager.findOne(Generation, {
            where: {
                id: generationId,
            },
            relations: {
                trims: true,
                model: true,
            },
        });

        if (generation == null) {
            console.warn(`getStoredGenerationWithTrims: No Generation for generationId:${generationId}`);
            return null;
        } else if (generation.model == null) {
            console.warn(`getStoredGenerationWithTrims: No Model for generationId:${generationId}`);
            return null;
        }

        return generation;
    }

    private async getStoredTrimWithTrimDetails(trimId: number): Promise<Trim | null> {
        const trim = await AppDataSource.manager.findOne(Trim, {
            where: {
                id: trimId,
            },
            relations: {
                generation: true,
                trimDetails: true,
            },
        });

        if (trim == null) {
            console.warn(`getStoredTrim: No Trim for trimId:${trimId}`);
            return null;
        }
        /*else if (trim.trimDetails == null) {
            console.warn(`getStoredTrim: No TrimDetails for trimId:${trimId}`);
            return null;
        }*/

        return trim;
    }

    //#endregion

    //#region Scraping methods
    private async scrapeBrands(): Promise<any[]> {
        const url = 'https://www.auto-data.net/en/allbrands';

        await this.scraper.initialize();
        await this.scraper.goto(url);

        return await this.scraper.page!.evaluate(() => {
            const links = Array.from(document.querySelectorAll('div.brands > a'));
            return links
                .map((link) => {
                    const brandName = link.querySelector('strong')?.textContent?.trim();
                    const url = link.getAttribute('href')?.split('/')[2];
                    const imageUrl = link.querySelector('img')?.getAttribute('src');

                    return {
                        name: brandName || '',
                        url: url || '',
                        imageUrl: imageUrl || ''
                    };
                })
                .filter((item) => item.url);
        });
    }

    private async scrapeModelsByBrandUrl(brandUrl: string): Promise<any[]> {
        const url = `https://www.auto-data.net/en/${brandUrl}`;

        await this.scraper.initialize();
        await this.scraper.goto(url);

        return await this.scraper.page!.evaluate(() => {
            const modelLinks = Array.from(document.querySelectorAll('a.modeli'));

            return modelLinks
                .map((link) => {
                    const name = link.querySelector('strong')?.textContent;
                    const url = link.getAttribute('href')?.split('/')[2];
                    const year = link.querySelector('div')?.textContent;
                    const startYear = year?.split('-')[0].trim();
                    const endYear = year?.split('-')[1]?.trim();
                    const imageUrl = link.querySelector('img')?.getAttribute('src');

                    return {
                        name: name || '',
                        url: url || '',
                        startYear: startYear || '',
                        endYear: endYear || '',
                        imageUrl: imageUrl || '',
                    }
                })
                .filter((model) => model.url) // Filter out any entries without href;
        })
    }

    private async scrapeGenerationsByModelUrl(modelUrl: string): Promise<any[]> {
        const url = `https://www.auto-data.net/en/${modelUrl}`;

        await this.scraper.initialize();
        await this.scraper.goto(url);

        return await this.scraper.page!.evaluate(() => {
            // The generation list is a div per generation:
            //   <div class="generr"><div class="f"><a href="/en/<slug>">
            //     <img><strong class="tit">name</strong></a>
            //     <div class="i"><a><strong class="end">2001 - 2012</strong>
            //       <strong class="chas">Sedan</strong></a></div></div>
            // It used to be a table (table.generr tr.f), which the site no
            // longer emits, so this selector matched nothing at all.
            const generationRows = Array.from(document.querySelectorAll('div.generr div.f'));
            return generationRows
                .map((element) => {
                    const name = element.querySelector('strong.tit')?.textContent?.trim();
                    const url = element.querySelector('a[href]')?.getAttribute('href')?.split('/')[2];
                    const imageUrl = element.querySelector('img')?.getAttribute('src');
                    const chassisType = element.querySelector('strong.chas')?.textContent?.trim();

                    const yearCurElement = element.querySelector('strong.cur');
                    const yearEndElement = element.querySelector('strong.end');
                    const year = (yearCurElement ?? yearEndElement)?.textContent?.trim();
                    const startYear = year?.split('-')[0].trim();
                    // A row with a single year ("2000", or an unfinished range
                    // like "2019 - ") has no second segment. Without the ?. this
                    // threw on undefined and failed the whole page scrape.
                    const endYear = year?.split('-')[1]?.trim();

                    return {
                        name: name || '',
                        url: url || '',
                        startYear: startYear || '',
                        endYear: endYear || '',
                        chassisType: chassisType || '',
                        imageUrl: imageUrl || '',
                    }
                })
                .filter((generation) => generation.url); // Rows without an href carry no slug.
        })
    }

    private async scrapeTrimsByGenerationUrl(generationUrl: string): Promise<any[]> {
        const url = `https://www.auto-data.net/en/${generationUrl}`;

        await this.scraper.initialize();
        await this.scraper.goto(url);

        return await this.scraper.page!.evaluate(() => {
            // The gallery is page-level, not per row. Many generations render no
            // gallery at all, which is why the list is often empty.
            const imageUrls: string[] = Array.from(document.querySelectorAll('div.carTitimg img')).map(value => {
                return value.getAttribute('src') || '';
            });

            // Trims are divs as well:
            //   <div class="carlist"><div class="tri"><div class="thi">
            //     <a href="/en/<slug>"><strong><span class="tit">name</span>
            //     <span class="end">2001 - 2012</span></strong></a></div></div>
            // The old table.carlist tr.i selector matched nothing.
            const trimRows = Array.from(document.querySelectorAll('div.carlist div.tri'));
            return trimRows
                .map((element) => {
                    const name = element.querySelector('span.tit')?.textContent?.trim();
                    const url = element.querySelector('div.thi a[href]')?.getAttribute('href')?.split('/')[2];

                    const yearCurElement = element.querySelector('span.cur');
                    const yearEndElement = element.querySelector('span.end');
                    const year = (yearCurElement ?? yearEndElement)?.textContent?.trim();
                    const startYear = year?.split('-')[0].trim();
                    // Same guard as scrapeGenerationsByModelUrl: a single year
                    // has no second segment, and reading it threw.
                    const endYear = year?.split('-')[1]?.trim();

                    return {
                        name: name || '',
                        url: url || '',
                        startYear: startYear || '',
                        endYear: endYear || '',
                        // Unreachable fallback: an empty gallery is a truthy
                        // [], so the right-hand side can never be reached.
                        /* v8 ignore next -- [] is truthy, so this fallback is dead */
                        imageUrls: imageUrls || []
                    }
                })
                .filter((trim) => trim.url) // Filter out any entries without href;
        })
    }

    private async scrapeTrimDetailsByTrimUrl(trimUrl: string): Promise<any> {
        const url = `https://www.auto-data.net/en/${trimUrl}`;

        await this.scraper.initialize();
        await this.scraper.goto(url);

        return await this.scraper.page!.evaluate(() => {
            const trimDetails: any = {};

            // The specification table is now a list of divs:
            //   <div class="cardetailsout"><div class="cardetails">
            //     <div class="row"><div class="par">Brand</div>
            //       <div class="val">BMW</div></div>
            // The old table.cardetailsout tbody tr selector matched nothing.
            const rows = document.querySelectorAll('div.cardetailsout div.row');

            const cleanText = (element: Element | null): string => {
                // The null branch is unreachable: the only caller guards with
                // `if (!label || !value) return` two lines below.
                /* v8 ignore next -- unreachable: callers pass a non-null element */
                if (!element) return '';
                return element.textContent?.trim().replace(/\s+/g, ' ') || '';
            };

            /**
             * The first text node only. A value cell often carries a trailing
             * <span class="val2"> with the same figure in other units
             * ("3.3 l" + "3.49 US qt | 2.9 UK qt"), and only the primary one
             * belongs in the column.
             */
            const getMainValue = (cell: Element): string => {
                const text = cell.childNodes[0]?.textContent?.trim() || '';
                return text.replace(/\s+/g, ' ').trim();
            };

            rows.forEach(row => {
                const th = row.querySelector('div.par');
                const td = row.querySelector('div.val');

                if (!th || !td) return;

                const label = cleanText(th).toLowerCase();
                const value = getMainValue(td);

                // General information
                if (label.includes('brand')) trimDetails.brand = value;
                else if (label.includes('model') && !label.includes('code')) trimDetails.model = value;
                else if (label.includes('generation')) trimDetails.generation = value;
                else if (label.includes('modification') || label.includes('engine)')) trimDetails.modification = value;
                else if (label.includes('start of production')) trimDetails.startOfProduction = value;
                else if (label.includes('end of production')) trimDetails.endOfProduction = value;
                else if (label.includes('powertrain architecture')) trimDetails.powertrainArchitecture = value;
                else if (label.includes('body type')) trimDetails.bodyType = value;
                else if (label.includes('seats')) trimDetails.seats = value;
                else if (label.includes('doors')) trimDetails.doors = value;

                // Performance specs
                else if (label.includes('fuel consumption') && label.includes('urban') && !label.includes('extra')) trimDetails.fuelConsumptionUrban = value;
                else if (label.includes('fuel consumption') && label.includes('extra urban')) trimDetails.fuelConsumptionExtraUrban = value;
                else if (label.includes('fuel consumption') && label.includes('combined')) trimDetails.fuelConsumptionCombined = value;
                else if (label.includes('co') && label.includes('emission')) trimDetails.co2Emissions = value;
                else if (label.includes('fuel type')) trimDetails.fuelType = value;
                else if (label.includes('acceleration 0 - 100')) trimDetails.acceleration0100 = value;
                else if (label.includes('acceleration 0 - 62')) trimDetails.acceleration062 = value;
                else if (label.includes('acceleration 0 - 60')) trimDetails.acceleration060 = value;
                else if (label.includes('maximum speed')) trimDetails.maximumSpeed = value;
                else if (label.includes('emission standard')) trimDetails.emissionStandard = value;
                else if (label.includes('weight-to-power')) trimDetails.weightToPowerRatio = value;
                else if (label.includes('weight-to-torque')) trimDetails.weightToTorqueRatio = value;

                // Engine specs
                else if (label.includes('power') && !label.includes('steering')) trimDetails.power = value;
                // Unreachable: the branch above already matches every label
                // containing "power", which "power per litre" always does. So
                // trimDetails.powerPerLitre is never populated - a real data
                // gap, left in place rather than reordered without a decision.
                /* v8 ignore start -- shadowed by the generic `power` branch above */
                else if (label.includes('power per litre')) trimDetails.powerPerLitre = value;
                /* v8 ignore stop */
                else if (label.includes('torque')) trimDetails.torque = value;
                else if (label.includes('maximum engine speed')) trimDetails.maximumEngineSpeed = value;
                else if (label.includes('engine layout')) trimDetails.engineLayout = value;
                else if (label.includes('engine model') || label.includes('engine code')) trimDetails.engineModelCode = value;
                else if (label.includes('engine displacement')) trimDetails.engineDisplacement = value;
                else if (label.includes('number of cylinders')) trimDetails.numberOfCylinders = value;
                else if (label.includes('engine configuration')) trimDetails.engineConfiguration = value;
                else if (label.includes('cylinder bore')) trimDetails.cylinderBore = value;
                else if (label.includes('piston stroke')) trimDetails.pistonStroke = value;
                else if (label.includes('compression ratio')) trimDetails.compressionRatio = value;
                else if (label.includes('valves per cylinder')) trimDetails.valvesPerCylinder = value;
                else if (label.includes('fuel injection')) trimDetails.fuelInjectionSystem = value;
                else if (label.includes('engine aspiration')) trimDetails.engineAspiration = value;
                else if (label.includes('valvetrain')) trimDetails.valvetrain = value;
                else if (label.includes('engine oil capacity')) trimDetails.engineOilCapacity = value;
                else if (label.includes('engine oil specification')) {
                    // Handle locked content
                    const lockImg = td.querySelector('img.datalock');
                    if (lockImg) {
                        trimDetails.engineOilSpecification = '?';
                    } else {
                        trimDetails.engineOilSpecification = value;
                    }
                } else if (label.includes('coolant')) trimDetails.coolantCapacity = value;

                // Space, Volume and weights
                else if (label.includes('kerb weight') || label.includes('curb weight')) trimDetails.kerbWeight = value;
                else if (label.includes('max. weight')) trimDetails.maxWeight = value;
                else if (label.includes('max load')) trimDetails.maxLoad = value;
                else if (label.includes('trunk') || label.includes('boot space')) trimDetails.trunkSpaceMin = value;
                else if (label.includes('fuel tank capacity')) trimDetails.fuelTankCapacity = value;
                else if (label.includes('max. roof load')) trimDetails.maxRoofLoad = value;
                else if (label.includes('permitted trailer load with brakes')) trimDetails.permittedTrailerLoadWithBrakes = value;
                else if (label.includes('permitted trailer load without brakes')) trimDetails.permittedTrailerLoadWithoutBrakes = value;
                else if (label.includes('permitted towbar download')) trimDetails.permittedTowbarDownload = value;

                // Dimensions
                else if (label.includes('length')) trimDetails.length = value;
                else if (label.includes('width') && !label.includes('including')) trimDetails.width = value;
                else if (label.includes('width including mirrors')) trimDetails.widthIncludingMirrors = value;
                else if (label.includes('height')) trimDetails.height = value;
                else if (label.includes('wheelbase')) trimDetails.wheelbase = value;
                else if (label.includes('front track')) trimDetails.frontTrack = value;
                else if (label.includes('rear') && label.includes('track')) trimDetails.rearTrack = value;
                else if (label.includes('ride height') || label.includes('ground clearance')) trimDetails.rideHeight = value;
                else if (label.includes('drag coefficient')) trimDetails.dragCoefficient = value;
                else if (label.includes('minimum turning circle')) trimDetails.minimumTurningCircle = value;

                // Drivetrain, brakes and suspension
                else if (label.includes('drive wheel')) trimDetails.driveWheel = value;
                else if (label.includes('number of gears') || label.includes('gearbox')) trimDetails.gearbox = value;
                else if (label.includes('front suspension')) trimDetails.frontSuspension = value;
                else if (label.includes('rear suspension')) trimDetails.rearSuspension = value;
                else if (label.includes('front brakes')) trimDetails.frontBrakes = value;
                else if (label.includes('rear brakes')) trimDetails.rearBrakes = value;
                else if (label.includes('assisting systems')) {
                    const systems = Array.from(td.querySelectorAll('br')).map(() => '');
                    const text = td.innerHTML.replace(/<br\s*\/?>/g, '|').replace(/<[^>]*>/g, '');
                    trimDetails.assistingSystems = text.replace(/\|/g, ', ').trim();
                } else if (label.includes('steering type') && !label.includes('power')) trimDetails.steeringType = value;
                else if (label.includes('power steering')) trimDetails.powerSteering = value;
                // The site labels this "Tire size" now; "Tires size"/"Tyres size" before.
                else if (label.includes('tire size') || label.includes('tyres size')) trimDetails.tiresSize = value;
                // The site labels this "Wheel rim size" now, and "Wheel rims size" before.
                else if (label.includes('wheel rim')) trimDetails.wheelRimsSize = value;
            });

            return trimDetails;
        });
    }

    //#endregion
}
