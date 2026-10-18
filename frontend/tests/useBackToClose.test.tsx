import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useBackToClose,
  getActiveBackHandlersCount,
  clearActiveBackHandlers,
} from '../src/hooks/useBackToClose';

describe('useBackToClose hook', () => {
  beforeEach(() => {
    clearActiveBackHandlers();
    vi.restoreAllMocks();
  });

  it('pushes history state when overlay opens', () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const onClose = vi.fn();

    const { rerender } = renderHook(
      ({ isOpen }) => useBackToClose({ isOpen, onClose, id: 'test-sheet' }),
      { initialProps: { isOpen: false } }
    );

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(getActiveBackHandlersCount()).toBe(0);

    // Open overlay
    rerender({ isOpen: true });

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    expect(getActiveBackHandlersCount()).toBe(1);
  });

  it('closes topmost overlay when popstate event fires (back button pressed)', () => {
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();

    // Open first overlay
    renderHook(
      ({ isOpen }) => useBackToClose({ isOpen, onClose: onClose1, id: 'sheet-1' }),
      { initialProps: { isOpen: true } }
    );

    // Open second (nested/topmost) overlay
    renderHook(
      ({ isOpen }) => useBackToClose({ isOpen, onClose: onClose2, id: 'sheet-2' }),
      { initialProps: { isOpen: true } }
    );

    expect(getActiveBackHandlersCount()).toBe(2);

    // Simulate back button (popstate)
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Topmost (sheet-2) must be closed first
    expect(onClose2).toHaveBeenCalledTimes(1);
    expect(onClose1).not.toHaveBeenCalled();
    expect(getActiveBackHandlersCount()).toBe(1);

    // Another back button press closes sheet-1
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(onClose1).toHaveBeenCalledTimes(1);
    expect(getActiveBackHandlersCount()).toBe(0);
  });

  it('cleans up pushed history state on programmatic close without double entries', () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const backSpy = vi.spyOn(window.history, 'back');
    const onClose = vi.fn();

    const { rerender } = renderHook(
      ({ isOpen }) => useBackToClose({ isOpen, onClose, id: 'programmatic-sheet' }),
      { initialProps: { isOpen: true } }
    );

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    expect(getActiveBackHandlersCount()).toBe(1);

    // Close programmatically by setting isOpen = false
    rerender({ isOpen: false });

    // history.back() must be called to remove the pushed history entry
    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(getActiveBackHandlersCount()).toBe(0);
    expect(onClose).not.toHaveBeenCalled(); // programmatic close already closed it
  });
});
