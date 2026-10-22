import {Injectable, signal} from '@angular/core';

/** One stop on the drill-down path. A null link is the level you are on. */
export interface Crumb {
  label: string;
  /**
   * Router link segments. Absolute from the site root, not relative to the
   * current page: the pages live at nested depths, so a relative link would
   * resolve to somewhere inside the current branch instead of at an ancestor.
   */
  link: string[] | null;
}

/**
 * The path is four levels deep and the old build had no way back up it. The
 * header shows the whole path at all times, so every page is one click from any
 * ancestor. Pages publish their own crumbs as they load.
 */
@Injectable({providedIn: 'root'})
export class NavState {
  readonly crumbs = signal<Crumb[]>([]);

  set(crumbs: Crumb[]): void {
    this.crumbs.set(crumbs);
  }
}