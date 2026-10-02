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

interface GroupedBrands {
  letter: string;
  brands: Brand[];
}

@Component({
  selector: 'app-brands',
  imports: [AllBrandsItemComponent, RouterModule],
  templateUrl: './all-brands.component.html',
  styleUrl: './all-brands.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllBrandsComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly nav = inject(NavState);

  readonly loading = signal(true);
  readonly groupedBrands = signal<GroupedBrands[]>([]);
  readonly activeLetter = signal<string | null>(null);

  readonly total = computed(() =>
    this.groupedBrands().reduce((sum, group) => sum + group.brands.length, 0),
  );

  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    this.nav.set([]);
    void this.load();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.groupedBrands.set(this.group(await this.api.getAllBrands()));
      // Observed after the sections exist, and after a frame so the browser has
      // laid them out. Observing earlier would catch every section at zero
      // height and pick the wrong active letter.
      queueMicrotask(() => this.watchSections());
    } finally {
      this.loading.set(false);
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