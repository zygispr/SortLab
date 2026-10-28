import { useEffect } from 'react';
import { canStepBack, canStepForward, useAppStore } from '../store/appStore';

/** Fields that use these keys themselves (typing, choosing, sliding). */
function usesKeysItself(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * Page-wide shortcuts (FR-028): Space toggles Start/Pause/Resume, → and ← step while the
 * matching button is enabled. Fields that use the keys are left alone, and Space on a
 * focused button keeps its native activation.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (usesKeysItself(e.target)) return;
      const state = useAppStore.getState();
      if (e.key === ' ') {
        if (e.target instanceof HTMLButtonElement) return;
        state.togglePlay();
      } else if (e.key === 'ArrowRight' && canStepForward(state.run)) {
        state.stepForward();
      } else if (e.key === 'ArrowLeft' && canStepBack(state.run)) {
        state.stepBack();
      } else {
        return;
      }
      e.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
