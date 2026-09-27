import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ApiService} from '../../api.service';
import {Generation, Model} from "../../../../../library/src/models";
import {ModelItemComponent} from './model-item/model-item.component';

@Component({
  selector: 'app-model',
  imports: [
    ModelItemComponent
  ],
  templateUrl: './model.component.html',
  styleUrl: './model.component.css',
})
export class ModelComponent implements OnInit {
  model: Model | undefined;
  generations: Generation[] = [];
  loading = true;

  constructor(private route: ActivatedRoute, public api: ApiService, public router: Router, private changeDetector: ChangeDetectorRef) {
  }

  async ngOnInit() {
    this.loading = true;
    try {
      let modelUrl: string = this.route.snapshot.params["modelId"];
      let modelId: number = parseInt(modelUrl.split("-")[1]);
      let tempModel: Model = await this.api.getModelWithGenerations(modelId);
      if (tempModel == null) {
        console.log(`no model found for: ${modelUrl}`);
        await this.router.navigate([""]);
      }
      this.generations = tempModel!.generations;
      tempModel!.generations = [];
      this.model = tempModel!;
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }
}
