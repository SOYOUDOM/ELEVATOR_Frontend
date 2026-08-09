import { Directive, TemplateRef, inject } from '@angular/core';

/** What the repeater hands each rendered row. */
export interface ElvRepeaterItemContext<T> {
    $implicit: T;
    item: T;
    index: number;
    first: boolean;
    last: boolean;
    count: number;
}

/**
 * Marks the template the repeater stamps out per item.
 *
 * ```html
 * <ng-template elvRepeaterItem let-role let-i="index"> … </ng-template>
 * ```
 *
 * `ngTemplateContextGuard` is what makes `let-role` strongly typed inside the
 * template instead of `any` — without it the whole point of a generic
 * repeater is lost the moment you use it.
 */
@Directive({
    selector: '[elvRepeaterItem]',
    standalone: true,
})
export class ElvRepeaterItemDirective<T = unknown> {
    readonly template = inject<TemplateRef<ElvRepeaterItemContext<T>>>(TemplateRef);

    static ngTemplateContextGuard<T>(
        _dir: ElvRepeaterItemDirective<T>,
        _ctx: unknown
    ): _ctx is ElvRepeaterItemContext<T> {
        return true;
    }
}
