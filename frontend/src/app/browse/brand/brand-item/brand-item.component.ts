import {ChangeDetectionStrategy, Component, Input, computed} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Model} from '../../../../../../library/src/models';
import {entitySlug, isInProduction, yearRange} from '../../../format';

@Component({
  selector: 'app-brand-item',
  imports: [RouterLink],
  templateUrl: './brand-item.component.html',
  styleUrl: './brand-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandItemComponent {
  @Input({required: true}) item!: Model;

  protected readonly slug = computed(() => entitySlug(this.item?.name ?? '', this.item?.id ?? 0));
  protected readonly years = computed(() => yearRange(this.item?.startYear, this.item?.endYear));
  protected readonly inProduction = computed(() => isInProduction(this.item?.endYear));

  /**
   * A stored imageUrl is a URL to another origin, so it can fail even though it
   * is well-formed: a photo the site has since removed will 404, and some
   * origins are blocked outright. Dropping the image leaves the sunken plate,
   * which reads as a deliberate empty frame instead of a broken-image glyph.
   */
  protected onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}