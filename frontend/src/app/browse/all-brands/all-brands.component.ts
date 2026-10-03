import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {RouterModule} from '@angular/router';
import {ApiService} from '../../api.service';
import {AllBrandsItemComponent} from './all-brands-item/all-brands-item.component';
import {Brand} from '../../../../../library/src/models';
import {NavState} from '../../nav-state';
import {LoadState} from '../../load-state';
import {LoadStatusComponent} from '../load-status/load-status.component';

interface GroupedBrands {
  letter: string;
  brands: Brand[];
}

@Component({
  selector: 'app-brands',
  imports: [AllBrandsItemComponent, RouterModule, LoadStatusComponent],
  templateUrl: './all-brands.component.html',
  styleUrl: './all-brands.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllBrandsComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly nav = inject(NavState);
  readonly load = inject(LoadState);

  readonly groupedBrands = signal<GroupedBrands[]>([]);
  readonly activeLetter = signal<string | null>(null);

  readonly total = computed(() =>
    this.groupedBrands().reduce((sum, group) => sum + group.brands.length, 0),
  );

  private observer: IntersectionObserver | null = null;

  /** One per letter the real rail holds, so its height is reserved up front. */
  readonly railPlaceholders = Array.from({length: 27}, (_, i) => i);

/**
 * Placeholder letter groups, sized to the real distribution: the index runs
 * from one marque under "2" to thirty-odd under "A", so a uniform block of
 * rows would be a different height from what replaces it. These are the real
 * per-letter counts for the sections at the top of the page, which is where
 * its height is decided.
 *
 * Each group carries its own cells rather than a row count the template counts
 * up to: a repeater over a bare number array rendered nothing here, and the
 * cells are what the template actually iterates.
 */
readonly placeholderGroups = [1, 12, 8, 9, 7].map((count, group) => ({
  id: group,
  count,
  cells: Array.from({length: count}, (_, i) => ({id: `${group}-${i}`})),
}));

  ngOnInit(): void {
    this.nav.set([]);
    void this.fetchBrands();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private async fetchBrands(): Promise<void> {
    const token = this.load.begin();
    try {
      this.groupedBrands.set(this.group(await this.api.getAllBrands()));
      // Observed after the sections exist, and after a frame so the browser has
      // laid them out. Observing earlier would catch every section at zero
      // height and pick the wrong active letter.
      queueMicrotask(() => this.watchSections());
    } finally {
      this.load.end(token);
    }
  }

  private group(brands: Brand[]): GroupedBrands[] {
    const groups = new Map<string, Brand[]>();
    for (const brand of [...brands].sort((a, b) => a.name.localeCompare(b.name))) {
      // Brands starting with a digit ("212") group under the digit, so the rail
      // and the sections always describe the same set.
      const key = brand.name[0]?.toUpperCase() ?? '#';
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(brand);
      } else {
        groups.set(key, [brand]);
      }
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, items]) => ({letter, brands: items}));
  }

  /**
   * Tracks which letter the reader is under. The root margin shrinks the
   * viewport to a band just below the header, so a section becomes active as
   * its heading reaches the top rather than the instant it enters from below.
   */
  private watchSections(): void {
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) this.activeLetter.set(entry.target.id);
        }
      },
      {rootMargin: '-72px 0px -70% 0px', threshold: 0},
    );
    for (const section of document.querySelectorAll('.letter-section')) {
      this.observer.observe(section);
    }
  }

  trackLetter(_: number, group: GroupedBrands): string {
    return group.letter;
  }

  jumpTo(letter: string, event: Event): void {
    event.preventDefault();
    document.getElementById(letter)?.scrollIntoView({behavior: 'smooth', block: 'start'});
    this.activeLetter.set(letter);
  }
}