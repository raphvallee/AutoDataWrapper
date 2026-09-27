import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ApiService} from '../../api.service';
import {Brand, Model} from '../../../../../library/src/models'
import {BrandItemComponent} from './brand-item/brand-item.component';

@Component({
  selector: 'app-brand',
  imports: [
    BrandItemComponent
  ],
  templateUrl: './brand.component.html',
  styleUrl: './brand.component.css',
})
export class BrandComponent implements OnInit {
  brand: Brand | undefined;
  models: Model[] = [];
  loading = true;


  constructor(private route: ActivatedRoute, public api: ApiService, public router: Router, private changeDetector: ChangeDetectorRef) {
  }

  async ngOnInit() {
    this.loading = true;
    try {
      let brandUrl: string = this.route.snapshot.params["brandId"];
      let brandId: number = parseInt(brandUrl.split("-")[1]);
      let tempBrand: Brand = await this.api.getBrandWithModels(brandId);
      if (tempBrand == null) {
        console.log(`no brand found for: ${brandUrl}`);
        await this.router.navigate([""]);
      }
      this.models = tempBrand!.models;
      tempBrand!.models = [];
      this.brand = tempBrand!;
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }
}
