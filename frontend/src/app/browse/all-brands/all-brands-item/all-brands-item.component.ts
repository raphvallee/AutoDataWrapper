import {ChangeDetectionStrategy, Component, Input, computed} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Brand} from "../../../../../../library/src/models";
import {entitySlug} from '../../../format';

@Component({
  selector: 'app-allbrands-item',
  imports: [RouterLink],
  templateUrl: './all-brands-item.component.html',
  styleUrl: './all-brands-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllBrandsItemComponent {
  @Input({required: true}) item!: Brand;

  /**
   * A real router link, not a click handler on a bare anchor: that keeps the
   * entry focusable, reachable by keyboard, and openable in a new tab.
   */
  protected readonly slug = computed(() => entitySlug(this.item?.name ?? '', this.item?.id ?? 0));
}