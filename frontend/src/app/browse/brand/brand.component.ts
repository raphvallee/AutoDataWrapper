import {ChangeDetectionStrategy, Component, OnInit, inject, signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ApiService} from '../../api.service';
import {Brand, Model} from '../../../../../library/src/models';
import {BrandItemComponent} from './brand-item/brand-item.component';
import {NavState} from '../../nav-state';

@Component({
  selector: 'app-brand',
  imports: [BrandItemComponent],
  templateUrl: './brand.component.html',
  styleUrl: './brand.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly nav = inject(NavState);

  readonly brand = signal<Brand | null>(null);
  readonly models = signal<Model[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);

  async ngOnInit() {
    this.loading.set(true);
    this.failed.set(false);
    this.nav.set([]);
    try {
      const segment: string = this.route.snapshot.params['brandId'];
      const brandId = parseInt(segment.split('-')[1], 10);
      const loaded = await this.api.getBrandWithModels(brandId);
      if (!loaded) {
        this.failed.set(true);
        return;
      }
      const models = loaded.models ?? [];
      this.models.set(models);
      // models is dropped before the brand is stored: the list owns them now,
      // and a page should not hold the whole tree twice.
      this.brand.set({...loaded, models: []});
      this.nav.set([
        {label: 'Brands', link: ['/browse']},
        {label: loaded.name, link: null},
      ]);
    } catch {
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}