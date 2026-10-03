import {DestroyRef, Injectable, computed, inject, signal} from '@angular/core';

/**
 * One page's load, shared by the skeleton placeholders and the status line so
 * the two can never disagree about whether something is still in flight.
 *
 * Root-provided, like NavState, because only one drill-down page is mounted at
 * a time. `end` takes the token `begin` handed out, so a late response from a
 * page the router has already replaced cannot clear the state belonging to its
 * successor.
 */

/**
 * Below this the response lands within the same frame or two. Showing a
 * skeleton for 8ms and then replacing it is a grey flash, which reads as a
 * rendering fault rather than as progress, so nothing is drawn yet.
 */
export const FLASH_MS = 150;

/** Long enough that the skeleton alone stops explaining itself. */
export const SLOW_MS = 2000;

/**
 * Past this the wait is a scrape. The backend fetches a car it has never seen
 * from the source site on demand, driving a headless browser, and the scraper
 * allows itself 60s.
 *
 * Measured against the dev database: a stored car answers in 8-100ms, an
 * unstored one in 4-9s. The threshold sits above every observed cached read
 * and below every observed scrape, so the message names the right cause rather
 * than appearing on a slow disk or guessing at a hang.
 */
export const SCRAPE_MS = 3000;

export type LoadPhase = 'brief' | 'slow' | 'scrape';

@Injectable({providedIn: 'root'})
export class LoadState {
  private readonly destroyRef = inject(DestroyRef);

  private readonly active = signal(false);
  private readonly elapsedMs = signal(0);

  /** Identifies one begin/end pair, so a stale end cannot clear a newer load. */
  private token = 0;
  private currentToken = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** True for the whole request, used for aria-busy. */
  readonly busy = computed(() => this.active());

  /** Whether anything should be drawn yet. See FLASH_MS. */
  readonly visible = computed(() => this.active() && this.elapsedMs() >= FLASH_MS);

  readonly elapsed = computed(() => this.elapsedMs());

  readonly phase = computed<LoadPhase>(() => {
    const elapsed = this.elapsedMs();
    if (elapsed >= SCRAPE_MS) return 'scrape';
    if (elapsed >= SLOW_MS) return 'slow';
    return 'brief';
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());
  }

  begin(): number {
    this.token += 1;
    this.currentToken = this.token;
    this.active.set(true);
    this.elapsedMs.set(0);
    this.start();
    return this.token;
  }

  /** Ignores a token that is no longer the current load. */
  end(token: number): void {
    if (token !== this.currentToken) return;
    this.stop();
    this.active.set(false);
    this.elapsedMs.set(0);
  }

  private start(): void {
    this.stop();
    const started = performance.now();
    this.timer = setInterval(() => {
      this.elapsedMs.set(Math.round(performance.now() - started));
    }, 100);
  }

  private stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

/**
 * Seconds, rounded up, because the useful question is "is this still going"
 * rather than how precise the count is.
 */
export function secondsLabel(elapsedMs: number): string {
  return `${Math.max(1, Math.ceil(elapsedMs / 1000))}s`;
}