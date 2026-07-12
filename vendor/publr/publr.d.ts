// Editor-local type declarations for the vendored PublrJS runtime (publr.js).
// NOT vendored content: vendor-publr.sh copies only the .js files, so this
// file survives re-vendoring. It declares ONLY the runtime surface the editor
// uses — extend it when the editor starts using more of the runtime.

/** The window.Publr namespace the runtime claims on import. */
export interface PublrGlobal {
  reactive<T extends object>(obj: T): T;
  effect(fn: () => void): void;
  /** Register a store. Plain definition = SHARED singleton; function = LOCAL factory per island. */
  store(name: string, definition: object | ((...args: any[]) => any)): void;
  hydrate(root?: ParentNode): void;
  destroy(root?: ParentNode): void;
  portal(el: Element): void;
  unportal(el: Element): void;
  randomId(): string;
  // The runtime owns this namespace; hosts (like the editor) hang extra
  // members off it — window.Publr.Editor, Publr.editor, …
  [key: string]: any;
}

export function reactive<T extends object>(obj: T): T;
export function effect(fn: () => void, opts?: unknown): void;
export function hydrate(root?: ParentNode): void;
export function destroy(root?: ParentNode): void;
export function portal(el: Element): void;
export function unportal(el: Element): void;
export const Publr: PublrGlobal;
