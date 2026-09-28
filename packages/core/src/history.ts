import type { MarkupStatus } from './status';
import type { Markup } from './types';

type Listener = () => void;

export interface ReplaceOptions {
  /** When true (default) the undo/redo stacks are cleared — used on load. */
  resetHistory?: boolean;
}

/**
 * Snapshot-based undo/redo store for a document's markups.
 *
 * The current markups array reference is stable between mutations, so it can
 * feed React's useSyncExternalStore directly. Each edit pushes the previous
 * snapshot onto an undo stack (capped) and clears the redo stack.
 */
export class MarkupStore {
  private markups: Markup[];
  private past: Markup[][] = [];
  private future: Markup[][] = [];
  private listeners = new Set<Listener>();
  private readonly limit: number;

  constructor(initial: Markup[] = [], limit = 200) {
    this.markups = initial.slice();
    this.limit = limit;
  }

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = (): Markup[] => this.markups;

  private emit(): void {
    for (const l of this.listeners) l();
  }

  private commit(next: Markup[]): void {
    this.past.push(this.markups);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    this.markups = next;
    this.emit();
  }

  add(markup: Markup): void {
    this.commit([...this.markups, markup]);
  }

  update(id: string, patch: Partial<Markup>): void {
    let changed = false;
    const next = this.markups.map((m) => {
      if (m.id !== id) return m;
      changed = true;
      return { ...m, ...patch, updatedAt: new Date().toISOString() } as Markup;
    });
    if (changed) this.commit(next);
  }

  remove(id: string): void {
    const next = this.markups.filter((m) => m.id !== id);
    if (next.length !== this.markups.length) this.commit(next);
  }

  setStatus(id: string, status: MarkupStatus): void {
    this.update(id, { status } as Partial<Markup>);
  }

  /** Replace all markups (e.g. after loading a file). */
  replaceAll(markups: Markup[], options: ReplaceOptions = {}): void {
    const { resetHistory = true } = options;
    if (resetHistory) {
      this.past = [];
      this.future = [];
      this.markups = markups.slice();
      this.emit();
    } else {
      this.commit(markups.slice());
    }
  }

  get(id: string): Markup | undefined {
    return this.markups.find((m) => m.id === id);
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): void {
    const prev = this.past.pop();
    if (!prev) return;
    this.future.push(this.markups);
    this.markups = prev;
    this.emit();
  }

  redo(): void {
    const next = this.future.pop();
    if (!next) return;
    this.past.push(this.markups);
    this.markups = next;
    this.emit();
  }
}
