// Safe Storage Polyfill for restricted sandbox environments (such as sandboxed iframes)
// This script MUST be executed before any other import to intercept direct storage access.

interface SafeStorageEngine {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key?(index: number): string | null;
  length?: number;
}

declare global {
  interface Window {
    safeLocalStorage: SafeStorageEngine;
    safeSessionStorage: SafeStorageEngine;
  }
}

(function() {
  // 1. Detect if native localStorage is accessible and working
  let isLocalStorageAvailable = false;
  try {
    const testKey = '__storage_test_key__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    isLocalStorageAvailable = true;
  } catch (e) {
    isLocalStorageAvailable = false;
  }

  // 2. Detect if native sessionStorage is accessible and working
  let isSessionStorageAvailable = false;
  try {
    const testKey = '__storage_test_key__';
    window.sessionStorage.setItem(testKey, testKey);
    window.sessionStorage.removeItem(testKey);
    isSessionStorageAvailable = true;
  } catch (e) {
    isSessionStorageAvailable = false;
  }

  // If both are working perfectly, we do not need to apply any polyfills
  if (isLocalStorageAvailable && isSessionStorageAvailable) {
    return;
  }

  console.warn("EazyBilling Notice: Primary window storage is restricted or blocked in this sandbox. Initializing robust in-memory Storage fallback.");

  // Create an in-memory storage implementation
  const createMemoryStorage = (): SafeStorageEngine => {
    const backupStorage: Record<string, string> = {};
    const storageImpl = {
      getItem: function(key: string): string | null {
        return key in backupStorage ? backupStorage[key] : null;
      },
      setItem: function(key: string, value: string): void {
        backupStorage[key] = String(value);
      },
      removeItem: function(key: string): void {
        delete backupStorage[key];
      },
      clear: function(): void {
        for (const k in backupStorage) {
          delete backupStorage[k];
        }
      },
      key: function(index: number): string | null {
        const keys = Object.keys(backupStorage);
        return keys[index] || null;
      },
      get length(): number {
        return Object.keys(backupStorage).length;
      }
    };

    return new Proxy(storageImpl, {
      get(target, prop) {
        if (prop === 'getItem' || prop === 'setItem' || prop === 'removeItem' || prop === 'clear' || prop === 'key' || prop === 'length') {
          return (target as any)[prop];
        }
        if (typeof prop === 'string') {
          return prop in backupStorage ? backupStorage[prop] : undefined;
        }
        return (target as any)[prop];
      },
      set(target, prop, value) {
        if (typeof prop === 'string') {
          backupStorage[prop] = String(value);
          return true;
        }
        return false;
      },
      deleteProperty(target, prop) {
        if (typeof prop === 'string') {
          delete backupStorage[prop];
          return true;
        }
        return false;
      }
    });
  };

  const memLocalStorage = createMemoryStorage();
  const memSessionStorage = createMemoryStorage();

  const safeLocal = {
    getItem: (key: string): string | null => {
      try {
        if (isLocalStorageAvailable) return window.localStorage.getItem(key);
      } catch (e) {}
      return memLocalStorage.getItem(key);
    },
    setItem: (key: string, value: string): void => {
      try {
        if (isLocalStorageAvailable) {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch (e) {}
      memLocalStorage.setItem(key, value);
    },
    removeItem: (key: string): void => {
      try {
        if (isLocalStorageAvailable) {
          window.localStorage.removeItem(key);
          return;
        }
      } catch (e) {}
      memLocalStorage.removeItem(key);
    },
    clear: (): void => {
      try {
        if (isLocalStorageAvailable) {
          window.localStorage.clear();
          return;
        }
      } catch (e) {}
      memLocalStorage.clear();
    }
  };

  const safeSession = {
    getItem: (key: string): string | null => {
      try {
        if (isSessionStorageAvailable) return window.sessionStorage.getItem(key);
      } catch (e) {}
      return memSessionStorage.getItem(key);
    },
    setItem: (key: string, value: string): void => {
      try {
        if (isSessionStorageAvailable) {
          window.sessionStorage.setItem(key, value);
          return;
        }
      } catch (e) {}
      memSessionStorage.setItem(key, value);
    },
    removeItem: (key: string): void => {
      try {
        if (isSessionStorageAvailable) {
          window.sessionStorage.removeItem(key);
          return;
        }
      } catch (e) {}
      memSessionStorage.removeItem(key);
    },
    clear: (): void => {
      try {
        if (isSessionStorageAvailable) {
          window.sessionStorage.clear();
          return;
        }
      } catch (e) {}
      memSessionStorage.clear();
    }
  };

  (window as any).safeLocalStorage = safeLocal;
  (window as any).safeSessionStorage = safeSession;

  // 3. Apply LocalStorage override safely if restricted
  if (!isLocalStorageAvailable) {
    try {
      Object.defineProperty(Window.prototype, 'localStorage', {
        get() {
          return safeLocal;
        },
        configurable: true,
        enumerable: true
      });
    } catch (e1) {
      try {
        Object.defineProperty(window, 'localStorage', {
          value: safeLocal,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e2) {
        console.warn("Storage Polyfill Warning: Unable to override native window.localStorage.", e2);
      }
    }
  }

  // 4. Apply SessionStorage override safely if restricted
  if (!isSessionStorageAvailable) {
    try {
      Object.defineProperty(Window.prototype, 'sessionStorage', {
        get() {
          return safeSession;
        },
        configurable: true,
        enumerable: true
      });
    } catch (e1) {
      try {
        Object.defineProperty(window, 'sessionStorage', {
          value: safeSession,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e2) {
        console.warn("Storage Polyfill Warning: Unable to override native window.sessionStorage.", e2);
      }
    }
  }
})();
