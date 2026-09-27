import {Request, Response, Router} from 'express';
import {FetchProvider} from "./data/fetch-provider.service";

const router = Router();
let fetchProvider: FetchProvider;

// Every handler awaits inside a try/catch. These used to chain .then()
// with no rejection handler, so a single failed lookup became an
// unhandled rejection and took the whole server process down.
router.get('/brands', async (req: Request, res: Response) => {
    try {
        res.json(await getProvider().getBrands());
    } catch (e) {
        console.error('GET /brands failed', e);
        res.status(500).json({error: 'Failed to load brands'});
    }
});

router.get('/brand/:brandId', async (req: Request, res: Response) => {
    let brandId: number = parseInt(<string>req.params.brandId);
    try {
        res.json(await getProvider().getBrandWithModels(brandId));
    } catch (e) {
        console.error(`GET /brand/${brandId} failed`, e);
        res.status(500).json({error: 'Failed to load brand'});
    }
});

router.get('/model/:modelId', async (req: Request, res: Response) => {
    let modelId: number = parseInt(<string>req.params.modelId);
    try {
        res.json(await getProvider().getModelWithGenerations(modelId));
    } catch (e) {
        console.error(`GET /model/${modelId} failed`, e);
        res.status(500).json({error: 'Failed to load model'});
    }
});

router.get('/generation/:generationId', async (req: Request, res: Response) => {
    let generationId: number = parseInt(<string>req.params.generationId);
    try {
        res.json(await getProvider().getGenerationWithTrims(generationId));
    } catch (e) {
        console.error(`GET /generation/${generationId} failed`, e);
        res.status(500).json({error: 'Failed to load generation'});
    }
});

router.get('/trim/:trimId', async (req: Request, res: Response) => {
    let trimId: number = parseInt(<string>req.params.trimId);
    try {
        res.json(await getProvider().getTrimWithDetails(trimId));
    } catch (e) {
        console.error(`GET /trim/${trimId} failed`, e);
        res.status(500).json({error: 'Failed to load trim'});
    }
});

function getProvider() {
    if (fetchProvider) {
        return fetchProvider;
    } else {
        fetchProvider = new FetchProvider();
    }
    return fetchProvider;
}

export default router;