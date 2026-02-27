import { useState, useCallback } from 'react';

// Custom hook for handling localStorage with React state
export function useLocalStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue instanceof Function ? initialValue() : initialValue;
      }
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
      return initialValue instanceof Function ? initialValue() : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue instanceof Function ? initialValue() : initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = useCallback((value) => {
    setStoredValue((prevValue) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(prevValue) : value;
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          } catch (err) {
            if ((err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014) && key === 'chatSessions') {
              console.warn("localStorage quota exceeded! Stripping image base64 data to save space.");
              const strippedValue = valueToStore.map(session => ({
                ...session,
                history: session.history.map(msg => msg.type === 'image' && msg.image ? { ...msg, image: null } : msg)
              }));
              try {
                window.localStorage.setItem(key, JSON.stringify(strippedValue));
              } catch (fallbackErr) {
                console.error("Even after stripping images, localStorage is full.", fallbackErr);
              }
            } else {
              throw err;
            }
          }
        }
        return valueToStore;
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
        return prevValue;
      }
    });
  }, [key]);

  return [storedValue, setValue];
}
