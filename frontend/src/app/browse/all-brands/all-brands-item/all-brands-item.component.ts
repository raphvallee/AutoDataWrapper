import {Component, Input} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Brand} from "../../../../../../library/src/models";
import {SlugifyPipe} from '../../../slugify-pipe';

@Component({
  selector: 'app-allbrands-item',
  imports: [],
  templateUrl: './all-brands-item.component.html',
  styleUrl: './all-brands-item.component.css',
  providers: [SlugifyPipe]
})
export class AllBrandsItemComponent {
  @Input({required: true}) item!: Brand;

  /** Shown when the marque has no logo, or its logo fails to load. */
  readonly placeholder = 'https://placehold.co/100x100?text=No+logo';

  constructor(public router: Router, private route: ActivatedRoute, private pipe: SlugifyPipe) {
  }

  /**
   * A stored imageUrl is a URL to another origin, so it can fail even though it
   * is well-formed: a logo the site has since renamed or dropped 404s. Without
   * this the browser shows its own broken-image icon, which reads as a bug in
   * the app rather than missing artwork.
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.src === this.placeholder) return;
    img.src = this.placeholder;
  }

  public async clicked() {
    let brandName = this.pipe.transform(this.item.name);
    let brandUrl = brandName + "-" + this.item.id;
    await this.router.navigate([brandUrl], {relativeTo: this.route});
  }
}
