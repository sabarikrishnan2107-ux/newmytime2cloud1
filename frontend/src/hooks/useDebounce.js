// hooks/useDebounce.js
import { useRef, useEffect, useMemo } from 'react';

export const useDebounce = (callback, delay) => {
  const callbackRef = useRef(callback);

  // Update the ref if the callback changes (prevents stale closures)
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(() => {
    let timer;

    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    };
  }, [delay]);
};