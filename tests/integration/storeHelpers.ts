import { act } from '@testing-library/react';
import { type AppState, type RunState, useAppStore } from '../../src/store/appStore';

/** Restores the shared store's initial state (actions included) before each test. */
export function resetStore(): void {
  useAppStore.setState(useAppStore.getInitialState(), true);
}

/** Patches the current run, as the store would after some action. */
export function setRun(patch: Partial<RunState>): void {
  act(() => {
    useAppStore.setState((s) => ({ run: { ...s.run, ...patch } }));
  });
}

/** Replaces store actions with spies so a test can check what a control calls. */
export function spyOn<K extends keyof AppState>(
  ...names: K[]
): Record<K, ReturnType<typeof vi.fn>> {
  const spies = {} as Record<K, ReturnType<typeof vi.fn>>;
  for (const name of names) spies[name] = vi.fn();
  useAppStore.setState(spies as unknown as Partial<AppState>);
  return spies;
}
