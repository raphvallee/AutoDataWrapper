import {Component, Input} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Model} from '../../../../../../library/src/models'
import {SlugifyPipe} from '../../../slugify-pipe';
import {DatePipe} from '@angular/common';

@Component({
  selector: 'app-brand-item',
  imports: [
    DatePipe
  ],
  templateUrl: './brand-item.component.html',
  styleUrl: './brand-item.component.css',
  providers: [SlugifyPipe]
})
export class BrandItemComponent {
  @Input({required: true}) item!: Model;

  /** Shown when the model has no photo, or its photo fails to load. */
  readonly placeholder = 'https://placehold.co/100x100?text=No+photo';

  constructor(public router: Router, private route: ActivatedRoute, private pipe: SlugifyPipe) {
  }

  /**
   * A stored imageUrl is a URL to another origin, so it can fail even though it
   * is well-formed: a photo the site has since removed 404s. Without this the
   * browser shows its own broken-image icon.
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.src === this.placeholder) return;
    img.src = this.placeholder;
  }

  public async clicked() {
    let modelName = this.pipe.transform(this.item.name);
    let modelUrl = modelName + "-" + this.item.id;
    await this.router.navigate([modelUrl], {relativeTo: this.route});
  }
}
