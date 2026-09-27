import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {Generation, Trim} from "../../../../../library/src/models";
import {ActivatedRoute, Router} from '@angular/router';
import {ApiService} from '../../api.service';
import {GenerationItemComponent} from './generation-item/generation-item.component';

@Component({
  selector: 'app-generation',
  imports: [
    GenerationItemComponent
  ],
  templateUrl: './generation.component.html',
  styleUrl: './generation.component.css',
})
export class GenerationComponent implements OnInit {
  generation: Generation | undefined;
  trims: Trim[] = [];
  loading = true;

  constructor(private route: ActivatedRoute, public api: ApiService, public router: Router, private changeDetector: ChangeDetectorRef) {
  }

  async ngOnInit() {
    this.loading = true;
    try {
      let generationUrl: string = this.route.snapshot.params["generationId"];
      let generationId: number = parseInt(generationUrl.split("-")[1]);
      let tempGeneration: Generation = await this.api.getGenerationWithTrims(generationId);
      if (tempGeneration == null) {
        console.log(`no generation found for: ${generationUrl}`);
        await this.router.navigate([""]);
      }
      this.trims = tempGeneration!.trims;
      tempGeneration!.trims = [];
      this.generation = tempGeneration!;
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }
}
