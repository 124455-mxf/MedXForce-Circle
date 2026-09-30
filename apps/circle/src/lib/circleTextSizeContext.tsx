import { createContext, useContext, type ReactNode } from 'react';
import type { CircleTextSize } from './circleTextSizePreferences';

type CircleTextSizeContextValue = {
  textSize: CircleTextSize;
  setTextSize: (size: CircleTextSize) => void;
};

const CircleTextSizeContext = createContext<CircleTextSizeContextValue | null>(null);

export function CircleTextSizeProvider({
  textSize,
  setTextSize,
  children,
}: CircleTextSizeContextValue & { children: ReactNode }) {
  return (
    <CircleTextSizeContext.Provider value={{ textSize, setTextSize }}>
      {children}
    </CircleTextSizeContext.Provider>
  );
}

export function useCircleTextSizeFromContext(): CircleTextSizeContextValue {
  const value = useContext(CircleTextSizeContext);
  if (!value) {
    throw new Error('useCircleTextSizeFromContext must be used within CircleTextSizeProvider');
  }
  return value;
}
