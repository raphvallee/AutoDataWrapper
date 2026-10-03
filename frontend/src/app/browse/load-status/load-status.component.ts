import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {LoadState, secondsLabel} from '../../load-state';

/**
 * The line that says what is happening, for the loads long enough to need it.
 *
 * It escalates rather than repeating itself. A cached read answers in 8-100ms
 * and is covered by the skeletons alone; a cold read is the backend going out
 * to the source site for a car it has never seen, which is a genuinely
 * different wait and is worth naming so the page does not look hung.
 *
 * The region is always in the DOM and only its text changes, because a live
 * region that appears at the same moment as its content is unreliable in
 * several screen readers.
 */
@Component({
  selector: 'app-load-status',
  templateUrl: './load-status.component.html',
  styleUrl: './load-status.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadStatusComponent {
  /**
   * What is being waited for. Empty on the way in, because the name is part of
   * the response that has not arrived, so the copy has to stand on its own
   * rather than leave a dangling "Loading …".
   *
   * A noun phrase without an article ("the brand index"), so the messages can
   * add their own and never produce "Loading the brand index" mid-sentence with
   * a stray capital.
   */
  readonly subject = input<string>('');

  /**
   * Whether a long wait here means the backend is scraping.
   *
   * True for a drill-down page, which fetches on demand for a car it has not
   * stored. False for the brand index, which only scrapes when the marques
   * table is empty and otherwise just reads: claiming a scrape there would
   * explain a wait that never happens, and would explain it wrongly.
   */
  readonly scrapes = input(true);

  private readonly load = inject(LoadState);

  /** What the wait is being called, with its own capital for sentence starts. */
  private readonly thing = computed(() => {
    const raw = this.subject().trim();
    return raw ? raw[0].toUpperCase() + raw.slice(1) : '';
  });

  readonly message = computed(() => {
    const subject = this.thing();

    if (this.load.phase() === 'scrape') {
      if (!this.scrapes()) {
        return subject
          ? `Still reading the database. ${subject} is taking longer than usual.`
          : 'Still reading the database.';
      }
      return subject
        ? `Fetching ${subject} from the source site. First look-up, so it can take a minute.`
        : 'Fetching this car from the source site. First look-up, so it can take a minute.';
    }
    return subject ? `Loading ${subject}` : 'Loading';
  });

  /** Only the escalating message is worth announcing; the brief one repeats. */
  readonly announce = computed(() => this.load.phase() !== 'brief');

  /**
   * The clock is only useful once there is something to count. Before the slow
   * phase it ticks over from 1s on a request that may finish at 1.1s, which
   * draws the eye to a number about to be contradicted.
   */
  readonly showClock = computed(() => this.load.phase() !== 'brief');

  readonly elapsed = computed(() => secondsLabel(this.load.elapsed()));
}