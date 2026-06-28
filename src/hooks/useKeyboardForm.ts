import React, { useEffect, useCallback } from 'react';
import { KeyboardTraversalEngine, POSFieldKey } from '../services/KeyboardTraversalEngine';

interface KeyboardFormOptions {
  onCommitInvoice: () => Promise<void> | void;
  onOpenSearchModal: () => void;
  onEscapeAction: () => void;
  activeField?: POSFieldKey;
  setActiveField?: (key: POSFieldKey) => void;
}

export function useKeyboardForm({
  onCommitInvoice,
  onOpenSearchModal,
  onEscapeAction,
  activeField,
  setActiveField
}: KeyboardFormOptions) {

  /**
   * Action key down interceptor for POS input fields to traverse forward instead of submitting.
   */
  const handleFieldKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement> | KeyboardEvent,
    currentKey: POSFieldKey
  ) => {
    if (event.key === 'Enter') {
      // Intercept the native DOM KeyboardEvent inside form contexts.
      event.preventDefault();
      
      const nextKey = KeyboardTraversalEngine.triggerNextFocus(currentKey);
      if (setActiveField) {
        setActiveField(nextKey);
      }
    }
  }, [setActiveField]);

  // Handle active field-level focus and highlight effects dynamically on element reference mounts.
  useEffect(() => {
    const keys: POSFieldKey[] = ['customerField', 'barcodeField', 'qtyField', 'priceField', 'discountField'];
    
    const focusHandlers = keys.map((key) => {
      const el = KeyboardTraversalEngine.getElement(key);
      if (!el) return null;

      const onFocus = () => {
        KeyboardTraversalEngine.applyFocusStyling(el);
        if (setActiveField) {
          setActiveField(key);
        }
      };

      const onBlur = () => {
        KeyboardTraversalEngine.removeFocusStyling(el);
      };

      // Apply initial styling check if activeField matches
      if (activeField === key) {
        KeyboardTraversalEngine.applyFocusStyling(el);
      }

      el.addEventListener('focus', onFocus);
      el.addEventListener('blur', onBlur);

      return { el, onFocus, onBlur };
    });

    return () => {
      focusHandlers.forEach((handler) => {
        if (handler) {
          handler.el.removeEventListener('focus', handler.onFocus);
          handler.el.removeEventListener('blur', handler.onBlur);
        }
      });
    };
  }, [activeField, setActiveField]);

  // Centralized window keyboard listener for system hotkey interceptors
  useEffect(() => {
    const handleGlobalShortcuts = async (event: KeyboardEvent) => {
      // 1. [F8 Key]: Instantly trigger active invoice commit, write to Dexie and print
      if (event.key === 'F8') {
        event.preventDefault();
        console.log('[useKeyboardForm Hook]: F8 Intercepted. Committing Ledger Invoice...');
        try {
          await onCommitInvoice();
        } catch (err) {
          console.error('[useKeyboardForm Hook]: Error during F8 onCommitInvoice execution: ', err);
        }
      }

      // 2. [F2 Key]: Open client ledger & product inventory look-up search dashboard
      if (event.key === 'F2') {
        event.preventDefault();
        console.log('[useKeyboardForm Hook]: F2 Intercepted. Opening search query engine...');
        onOpenSearchModal();
      }

      // 3. [Escape Key]: Close modal alerts overlays, or safely reset current focus values without clearing items collection cache
      if (event.key === 'Escape') {
        event.preventDefault();
        console.log('[useKeyboardForm Hook]: Escape Intercepted. Closing modals or resetting focus state...');
        onEscapeAction();
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, [onCommitInvoice, onOpenSearchModal, onEscapeAction]);

  return {
    handleFieldKeyDown
  };
}
export default useKeyboardForm;
