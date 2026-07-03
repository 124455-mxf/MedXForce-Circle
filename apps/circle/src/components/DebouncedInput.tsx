import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onImmediateChange?: (value: string) => void;
  debounceTime?: number;
}

export const DebouncedInput = React.forwardRef<HTMLInputElement, DebouncedInputProps>(({
  value,
  onChange,
  onImmediateChange,
  debounceTime = 300,
  className,
  ...props
}, ref) => {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    if (value !== localValue) setLocalValue(value);
  }, [value, localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    onImmediateChange?.(newVal);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (debounceTime <= 0) {
      onChange(newVal);
      return;
    }
    timerRef.current = setTimeout(() => onChange(newVal), debounceTime);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (localValue !== value) onChange(localValue);
    props.onBlur?.(e);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <input
      {...props}
      ref={setRefs}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn(className)}
    />
  );
});

DebouncedInput.displayName = 'DebouncedInput';
