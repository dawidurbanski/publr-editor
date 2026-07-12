// Editor-local type declarations for the vendored publr-position.js.
// NOT vendored content — see publr.d.ts.

export interface PositionOptions {
  placement?: string;
  offset?: number;
}

/** Position a floating element relative to an anchor (dropdowns, popovers). */
export function position(el: HTMLElement, anchor: Element, opts?: PositionOptions): void;
