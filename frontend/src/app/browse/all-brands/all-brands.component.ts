import {CommonModule} from '@angular/common';
import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {RouterModule} from '@angular/router';
import {ApiService} from '../../api.service';
import {AllBrandsItemComponent} from './all-brands-item/all-brands-item.component';
import {Brand} from '../../../../../library/src/models'

interface GroupedBrands {
  letter: string;
  brands: Brand[];
}

@Component({
  selector: 'app-brands',
  imports: [
    AllBrandsItemComponent,
    CommonModule,
    RouterModule
  ],
  templateUrl: './all-brands.component.html',
  styleUrl: './all-brands.component.css',
})
export class AllBrandsComponent implements OnInit, AfterViewInit, OnDestroy {
  brands: Brand[] = [];
  groupedBrands: GroupedBrands[] = [];
  letters: string[] = [];
  isFloating = false;
  loading = true;

  @ViewChild('navTrigger') navTrigger!: ElementRef;
  private observer: IntersectionObserver | null = null;

  constructor(public api: ApiService, private changeDetector: ChangeDetectorRef) {
  }

  async ngOnInit() {
    this.loading = true;
    try {
      this.brands = await this.api.getAllBrands();
      this.processBrands();
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(([entry]) => {
      this.isFloating = !entry.isIntersecting;
      this.changeDetector.detectChanges();
    }, {
      threshold: [0]
    });

    if (this.navTrigger) {
      this.observer.observe(this.navTrigger.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private processBrands() {
    // Sort brands alphabetically
    this.brands.sort((a, b) => a.name.localeCompare(b.name));

    // Group brands by first letter
    const groups: { [key: string]: Brand[] } = {};
    this.brands.forEach(brand => {
      const firstLetter = brand.name[0].toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(brand);
    });

    this.letters = Object.keys(groups).sort().filter(letter => /^[A-Z]$/.test(letter));
    this.groupedBrands = Object.keys(groups).sort().map(letter => ({
      letter,
      brands: groups[letter]
    }));
  }
}
