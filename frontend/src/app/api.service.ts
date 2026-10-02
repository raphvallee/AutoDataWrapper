import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {lastValueFrom} from 'rxjs';
import {Brand, Generation, Model, Trim} from "../../../library/src/models";
import {FIXTURES} from './fixtures';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  serverUrl = "http://localhost:3000/";

  /**
   * Set to false to read from the backend again. Nothing else changes: the
   * fixture table returns the same shapes the endpoints serialise.
   */
  private readonly useFixtures = true;

  constructor(public http: HttpClient,) {
  }

  async getAllBrands(): Promise<Brand[]> {
    if (this.useFixtures) return FIXTURES.getAllBrands();
    return await lastValueFrom(this.http.get<Brand[]>(this.serverUrl + 'brands'));
  }

  async getBrandWithModels(brandId: number): Promise<Brand> {
    if (this.useFixtures) return FIXTURES.getBrandWithModels(brandId);
    return await lastValueFrom(this.http.get<Brand>(this.serverUrl + 'brand/' + brandId));
  }

  async getModelWithGenerations(modelId: number): Promise<Model> {
    if (this.useFixtures) return FIXTURES.getModelWithGenerations(modelId);
    return await lastValueFrom(this.http.get<Model>(this.serverUrl + 'model/' + modelId));
  }

  async getGenerationWithTrims(generationId: number): Promise<Generation> {
    if (this.useFixtures) return FIXTURES.getGenerationWithTrims(generationId);
    return await lastValueFrom(this.http.get<Generation>(this.serverUrl + 'generation/' + generationId));
  }

  async getTrimDetails(trimId: number): Promise<Trim> {
    if (this.useFixtures) return FIXTURES.getTrimDetails(trimId);
    return await lastValueFrom(this.http.get<Trim>(this.serverUrl + 'trim/' + trimId));
  }
}