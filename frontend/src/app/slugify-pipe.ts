import {Pipe, PipeTransform} from '@angular/core';
import {slugify} from './format';

/**
 * Kept as a pipe for template use. The implementation lives in format.ts
 * because route building needs the same slug outside a template, and two
 * copies of this would be free to drift apart.
 */
@Pipe({
  name: 'slugify',
})
export class SlugifyPipe implements PipeTransform {
  transform(input: string): string {
    return slugify(input);
  }
}