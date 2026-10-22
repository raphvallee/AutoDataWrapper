import {ChangeDetectionStrategy, Component, OnInit, inject, signal} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {Brand, Generation, Trim} from "../../../../../library/src/models";
import {ApiService} from '../../api.service';
import {Crumb, NavState} from '../../nav-state';
import {LoadState} from '../../load-state';
import {entitySlug, yearRange} from '../../format';
import {LoadStatusComponent} from '../load-status/load-status.component';

@Component({
  selector: 'app-generation',
  imports: [RouterLink, LoadStatusComponent],
  templateUrl: './generation.component.html',
  styleUrl: './generation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly nav = inject(NavState);
  readonly load = inject(LoadState);

  readonly generation = signal<Generation | null>(null);
  readonly trims = signal<Trim[]>([]);
  readonly failed = signal(false);
  readonly slugs = signal<Map<number, string>>(new Map());

  async ngOnInit() {
    this.failed.set(false);
    this.nav.set([]);
    const token = this.load.begin();
    try {
      const segment: string = this.route.snapshot.params['generationId'];
      const generationId = parseInt(segment.split('-')[1], 10);
      const loaded = await this.api.getGenerationWithTrims(generationId);
      if (!loaded) {
        this.failed.set(true);
        return;
      }
      const trims = loaded.trims ?? [];
      this.trims.set(trims);
      this.slugs.set(new Map(trims.map((t) => [t.id, entitySlug(t.name, t.id)])));
      this.generation.set({...loaded, trims: []});
      this.nav.set(this.pathFor(loaded));
    } catch {
      this.failed.set(true);
    } finally {
      this.load.end(token);
    }
  }

  /**
   * Normally the model page has already published the path, so this only
   * appends to it. On a direct load of a deep link the path starts empty and
   * has to be rebuilt from the record, which arrives with its model and the
   * model's brand.
   *
   * The links are absolute segment lists, not just a slug: the model route sits
   * at /browse/:brandId/:modelId, so a one-segment link would be read as a
   * brand id and land on the wrong page.
   */
  private pathFor(generation: Generation): Crumb[] {
    const self: Crumb = {label: generation.name, link: null};
    const inherited = this.nav.crumbs();
    if (inherited.length > 0) return [...inherited, self];

    const model = generation.model;
    if (!model) return [{label: 'Brands', link: ['/browse']}, self];
    const brand = model.brand;
    return [
      {label: 'Brands', link: ['/browse']},
      ...(brand ? [{label: brand.name, link: ['/browse', entitySlug(brand.name, brand.id)]}] : []),
      {label: model.name, link: ['/browse', ...this.ancestors(brand), entitySlug(model.name, model.id)]},
      self,
    ];
  }

  /** The brand segments a deeper route has to repeat to stay addressable. */
  private ancestors(brand: Brand | undefined): string[] {
    return brand ? [entitySlug(brand.name, brand.id)] : [];
  }

  years(start: Date | string | null, end: Date | string | null): string {
    return yearRange(start, end);
  }
}