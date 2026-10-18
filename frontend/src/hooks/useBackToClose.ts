import { useEffect, useRef, useId } from 'react';

export interface BackHandlerItem {
  id: string;
  close: () => void;
}

// Global stack of active closeable overlays (LIFO)
const activeHandlers: BackHandlerItem[] = [];
let isPopstateListenerActive = false;
let isProgrammaticBack = false;

const initPopstateListener = () => {
  if (isPopstateListenerActive || typeof window === 'undefined') return;

  window.addEventListener('popstate', () => {
    if (isProgrammaticBack) {
      isProgrammaticBack = false;
      return;
    }

    if (activeHandlers.length > 0) {
      const top = activeHandlers.pop();
      if (top) {
        top.close();
      }
    }
  });

  isPopstateListenerActive = true;
};

export interface UseBackToCloseOptions {
  isOpen: boolean;
  onClose: () => void;
  id?: string;
}

/**
 * useBackToClose hook:
 * Pushes a history state when an overlay opens.
 * When the user triggers back (popstate/Android back button), the topmost overlay is closed.
 * When the overlay is closed programmatically, the pushed history state is cleaned up.
 */
export const useBackToClose = ({ isOpen, onClose, id }: UseBackToCloseOptions): void => {
  const generatedId = useId();
  const handlerId = id || generatedId;
  const registeredRef = useRef<boolean>(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    initPopstateListener();
  }, []);

  useEffect(() => {
    if (isOpen && !registeredRef.current) {
      registeredRef.current = true;
      try {
        window.history.pushState({ modalId: handlerId }, '');
      } catch {
        // history unavailable
      }

      activeHandlers.push({
        id: handlerId,
        close: () => onCloseRef.current(),
      });
    } else if (!isOpen && registeredRef.current) {
      registeredRef.current = false;
      const index = activeHandlers.findIndex((h) => h.id === handlerId);
      if (index !== -1) {
        activeHandlers.splice(index, 1);
        isProgrammaticBack = true;
        try {
          if (window.history.state?.modalId === handlerId) {
            window.history.back();
          }
        } catch {
          // history unavailable
        }
      }
    }
  }, [isOpen, handlerId]);

  useEffect(() => {
    return () => {
      if (registeredRef.current) {
        registeredRef.current = false;
        const index = activeHandlers.findIndex((h) => h.id === handlerId);
        if (index !== -1) {
          activeHandlers.splice(index, 1);
          isProgrammaticBack = true;
          try {
            if (window.history.state?.modalId === handlerId) {
              window.history.back();
            }
          } catch {
            // history unavailable
          }
        }
      }
    };
  }, [handlerId]);
};

// Export activeHandlers for unit testing verification
export const getActiveBackHandlersCount = (): number => activeHandlers.length;
export const clearActiveBackHandlers = (): void => {
  activeHandlers.length = 0;
  isProgrammaticBack = false;
};
