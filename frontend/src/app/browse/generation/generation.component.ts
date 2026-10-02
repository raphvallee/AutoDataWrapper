import {ChangeDetectionStrategy, Component, OnInit, inject, signal} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {Generation, Trim} from "../../../../../library/src/models";
import {ApiService} from '../../api.service';
import {Crumb, NavState} from '../../nav-state';
import {entitySlug, yearRange} from '../../format';

@Component({
  selector: 'app-generation',
  imports: [RouterLink],
  templateUrl: './generation.component.html',
  styleUrl: './generation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly nav = inject(NavState);

  readonly generation = signal<Generation | null>(null);
  readonly trims = signal<Trim[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly slugs = signal<Map<number, string>>(new Map());

  async ngOnInit() {
    this.loading.set(true);
    this.failed.set(false);
    this.nav.set([]);
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
      this.loading.set(false);
    }
  }

  /**
   * Normally the model page has already published the path, so this only
   * appends to it. On a direct load of a deep link the path starts empty, and
   * the model name on the generation record is the most that is known without
   * another request.
   */
  private pathFor(generation: Generation): Crumb[] {
    const self: Crumb = {label: generation.name, link: null};
    const inherited = this.nav.crumbs();
    if (inherited.length > 0) return [...inherited, self];
    const parent = generation.model;
    return parent
      ? [
          {label: 'Brands', link: ['/browse']},
          {label: parent.name, link: ['/browse', entitySlug(parent.name, parent.id)]},
          self,
        ]
      : [{label: 'Brands', link: ['/browse']}, self];
  }

  years(start: Date | string | null, end: Date | string | null): string {
    return yearRange(start, end);
  }
}