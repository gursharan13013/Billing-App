// Safe in-memory storages as fallback for sandboxed iframe environments
const memoryLocalStorage: Record<string, string> = {};
const memorySessionStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return memoryLocalStorage[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      memoryLocalStorage[key] = value;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      delete memoryLocalStorage[key];
    }
  },
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (e) {
      for (const k in memoryLocalStorage) {
        delete memoryLocalStorage[k];
      }
    }
  }
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return memorySessionStorage[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      memorySessionStorage[key] = value;
    }
  },
  removeItem: (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      delete memorySessionStorage[key];
    }
  },
  clear: (): void => {
    try {
      sessionStorage.clear();
    } catch (e) {
      for (const k in memorySessionStorage) {
        delete memorySessionStorage[k];
      }
    }
  }
};
