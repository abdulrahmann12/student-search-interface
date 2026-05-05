import { useEffect, useRef, useState } from 'react';

export default function useDebouncedValue(value, delay = 300, resetKey = null) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const previousResetKeyRef = useRef(resetKey);

  useEffect(() => {
    if (previousResetKeyRef.current === resetKey) {
      return;
    }

    previousResetKeyRef.current = resetKey;
    setDebouncedValue(value);
  }, [resetKey, value]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}
