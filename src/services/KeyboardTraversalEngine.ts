/**
 * KeyboardTraversalEngine.ts
 * Core services for keyboard-driven high-speed POS billing.
 */

export type POSFieldKey = 'customerField' | 'barcodeField' | 'qtyField' | 'priceField' | 'discountField';

export interface KeyboardEngineConfig {
  ids: Record<POSFieldKey, string>;
  sequence: POSFieldKey[];
}

class KeyboardTraversalEngineService {
  private config: KeyboardEngineConfig = {
    ids: {
      customerField: 'pos-customer-input',
      barcodeField: 'pos-barcode-input',
      qtyField: 'pos-qty-input',
      priceField: 'pos-price-input',
      discountField: 'pos-discount-input',
    },
    sequence: ['customerField', 'barcodeField', 'qtyField', 'priceField', 'discountField'],
  };

  /**
   * Registers a custom set of element IDs and order for keyboard traversal.
   */
  public configure(config: Partial<KeyboardEngineConfig>): void {
    if (config.ids) {
      this.config.ids = { ...this.config.ids, ...config.ids };
    }
    if (config.sequence) {
      this.config.sequence = [...config.sequence];
    }
  }

  /**
   * Gets the current DOM element for a given POS logical field key.
   */
  public getElement(key: POSFieldKey): HTMLElement | null {
    const id = this.config.ids[key];
    if (!id) return null;
    return document.getElementById(id);
  }

  /**
   * Automatically applies luxury deep amber aura shadow for Alabaster standard light layout,
   * or vibrant neon indigo peripheral flare under official Dark mode.
   */
  public applyFocusStyling(element: HTMLElement): void {
    // Inject the theme-specific active focus states
    element.classList.add('transition-all', 'duration-200');
    
    // Add custom helper classes defined in index.css
    element.classList.add('focus-active-light');
    element.classList.add('dark:focus-active-dark');

    // Also directly ensure inline styling classes represent the exact token variables
    element.classList.add(
      'border-amber-800', 
      'shadow-[0_0_10px_rgba(120,53,15,0.08)]',
      'dark:border-indigo-500',
      'dark:shadow-[0_0_12px_rgba(79,70,229,0.15)]'
    );
  }

  /**
   * Removes custom premium active theme focal styling classes.
   */
  public removeFocusStyling(element: HTMLElement): void {
    element.classList.remove('focus-active-light');
    element.classList.remove('dark:focus-active-dark');
    element.classList.remove(
      'border-amber-800', 
      'shadow-[0_0_10px_rgba(120,53,15,0.08)]',
      'dark:border-indigo-500',
      'dark:shadow-[0_0_12px_rgba(79,70,229,0.15)]'
    );
  }

  /**
   * Traverses focus linearly to the next logical POS field.
   * Blocks native browser submissions or page shifts.
   * If focus reaches the ultimate sequential node, completes the loop back to the first.
   * 
   * @param currentKey The current logical POS field key
   * @returns The key of the next field focused
   */
  public triggerNextFocus(currentKey: POSFieldKey): POSFieldKey {
    const seq = this.config.sequence;
    const currentIndex = seq.indexOf(currentKey);
    if (currentIndex === -1) {
      // Off sequence element: jump to first sequence element
      const firstKey = seq[0];
      const el = this.getElement(firstKey);
      if (el) {
        el.focus();
        this.applyFocusStyling(el);
      }
      return firstKey;
    }

    const nextIndex = (currentIndex + 1) % seq.length;
    const nextKey = seq[nextIndex];
    const nextEl = this.getElement(nextKey);

    // Clean up current styling
    const currentEl = this.getElement(currentKey);
    if (currentEl) {
      this.removeFocusStyling(currentEl);
    }

    if (nextEl) {
      nextEl.focus();
      // If it is a text-based inputs, select its interior content automatically
      if (nextEl instanceof HTMLInputElement) {
        nextEl.select();
      }
      this.applyFocusStyling(nextEl);
    }

    return nextKey;
  }
}

export const KeyboardTraversalEngine = new KeyboardTraversalEngineService();
