import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {lastValueFrom} from 'rxjs';
import {Brand, Generation, Model, Trim} from "../../../library/src/models";

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  serverUrl = "http://localhost:3000/";

  constructor(public http: HttpClient,) {
  }

  async getAllBrands(): Promise<Brand[]> {
    return await lastValueFrom(this.http.get<Brand[]>(this.serverUrl + 'brands'));
  }

  async getBrandWithModels(brandId: number): Promise<Brand> {
    return await lastValueFrom(this.http.get<Brand>(this.serverUrl + 'brand/' + brandId));
  }

  async getModelWithGenerations(modelId: number): Promise<Model> {
    return await lastValueFrom(this.http.get<Model>(this.serverUrl + 'model/' + modelId));
  }

  async getGenerationWithTrims(generationId: number): Promise<Generation> {
    return await lastValueFrom(this.http.get<Generation>(this.serverUrl + 'generation/' + generationId));
  }

  async getTrimDetails(trimId: number): Promise<Trim> {
    return await lastValueFrom(this.http.get<Trim>(this.serverUrl + 'trim/' + trimId));
  }
}
