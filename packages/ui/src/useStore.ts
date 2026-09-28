import type { Markup, MarkupStore } from '@planmark/core';
import { useSyncExternalStore } from 'react';

/** Subscribe a component to a MarkupStore's markup list. */
export function useMarkups(store: MarkupStore): Markup[] {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
