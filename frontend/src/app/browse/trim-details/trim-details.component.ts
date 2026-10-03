import {ChangeDetectionStrategy, Component, OnInit, inject, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Trim, TrimDetails} from "../../../../../library/src/models";
import {ApiService} from '../../api.service';
import {Crumb, NavState} from '../../nav-state';
import {SpecGroup, entitySlug, groupDetails, headlineFigures, yearRange} from '../../format';

@Component({
  selector: 'app-trim',
  imports: [],
  templateUrl: './trim-details.component.html',
  styleUrl: './trim-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrimDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly nav = inject(NavState);

  readonly trim = signal<Trim | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);

  readonly figures = signal<{ label: string; value: string }[]>([]);
  readonly groups = signal<SpecGroup[]>([]);

  /** Index into imageUrls; the plate above the sheet shows this one. */
  readonly photo = signal(0);

  async ngOnInit() {
    this.loading.set(true);
    this.failed.set(false);
    this.nav.set([]);
    try {
      const segment: string = this.route.snapshot.params['trimId'];
      const trimId = parseInt(segment.split('-')[1], 10);
      const loaded = await this.api.getTrimDetails(trimId);
      if (!loaded) {
        this.failed.set(true);
        return;
      }
      const details = loaded.trimDetails;
      this.trim.set(loaded);
      if (details) {
        this.figures.set(headlineFigures(details));
        this.groups.set(groupDetails(details));
      }
      this.nav.set(this.pathFor(loaded));
    } catch {
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Appends to the path the generation page published, as with generations. On a
   * direct load of a deep link there is nothing to inherit, so the chain is
   * rebuilt from the record, which arrives with its generation, that
   * generation's model, and the model's brand.
   *
   * The links carry every segment down to their own level, not just a slug: each
   * route is nested under the one above it, so a short link resolves against the
   * current route and lands somewhere else entirely.
   */
  private pathFor(trim: Trim): Crumb[] {
    const self: Crumb = {label: trim.name, link: null};
    const inherited = this.nav.crumbs();
    if (inherited.length > 0) return [...inherited, self];

    const generation = trim.generation;
    if (!generation) return [{label: 'Brands', link: ['/browse']}, self];

    const model = generation.model;
    if (!model) {
      return [
        {label: 'Brands', link: ['/browse']},
        {label: generation.name, link: null},
        self,
      ];
    }

    const brand = model.brand;
    const brandSegments = brand ? [entitySlug(brand.name, brand.id)] : [];
    const modelSegments = [...brandSegments, entitySlug(model.name, model.id)];
    return [
      {label: 'Brands', link: ['/browse']},
      ...(brand ? [{label: brand.name, link: ['/browse', ...brandSegments]}] : []),
      {label: model.name, link: ['/browse', ...modelSegments]},
      {label: generation.name, link: ['/browse', ...modelSegments, entitySlug(generation.name, generation.id)]},
      self,
    ];
  }

  get photos(): string[] {
    return this.trim()?.imageUrls ?? [];
  }

  /** Null when the backend has no scraped record for this trim yet. */
  details(): TrimDetails | null {
    return this.trim()?.trimDetails ?? null;
  }

  get years(): string {
    const trim = this.trim();
    return trim ? yearRange(trim.startYear, trim.endYear) : '';
  }

  selectPhoto(index: number): void {
    this.photo.set(index);
  }

  onImageError(event: Event): void {
    // Leaves the empty plate showing rather than a broken-image glyph.
    (event.target as HTMLImageElement).style.visibility = 'hidden';
  }

  /** Missing source data is stated, not left blank; "?" means locked upstream. */
  valueText(value: string, locked: boolean): string {
    return locked ? 'Locked on the source site' : value || '—';
  }
}