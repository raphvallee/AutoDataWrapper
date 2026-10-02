import {ChangeDetectionStrategy, Component, OnInit, inject, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {Generation, Model} from "../../../../../library/src/models";
import {ApiService} from '../../api.service';
import {Crumb, NavState} from '../../nav-state';
import {entitySlug, yearRange} from '../../format';

@Component({
  selector: 'app-model',
  imports: [RouterLink],
  templateUrl: './model.component.html',
  styleUrl: './model.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly nav = inject(NavState);

  readonly model = signal<Model | null>(null);
  readonly generations = signal<Generation[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);

  /** Prebuilt so a row can link without re-deriving its own slug. */
  readonly slugs = signal<Map<number, string>>(new Map());

  async ngOnInit() {
    this.loading.set(true);
    this.failed.set(false);
    this.nav.set([]);
    try {
      const segment: string = this.route.snapshot.params['modelId'];
      const modelId = parseInt(segment.split('-')[1], 10);
      const loaded = await this.api.getModelWithGenerations(modelId);
      if (!loaded) {
        this.failed.set(true);
        return;
      }
      const generations = loaded.generations ?? [];
      this.generations.set(generations);
      this.slugs.set(new Map(generations.map((g) => [g.id, entitySlug(g.name, g.id)])));
      this.model.set({...loaded, generations: []});

      const brand = loaded.brand;
      const crumbs: Crumb[] = [{label: 'Brands', link: ['/browse']}];
      if (brand) {
        crumbs.push({label: brand.name, link: ['/browse', entitySlug(brand.name, brand.id)]});
      }
      crumbs.push({label: loaded.name, link: null});
      this.nav.set(crumbs);
    } catch {
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Clicks anywhere in the row navigate, except on the anchor itself: that one
   * carries its own routerLink, and letting both handle the same click would
   * start two navigations.
   */
  open(event: Event, slug: string): void {
    if ((event.target as Element).closest('a')) return;
    void this.router.navigate([slug], {relativeTo: this.route});
  }

  years(start: Date | string | null, end: Date | string | null): string {
    return yearRange(start, end);
  }
}