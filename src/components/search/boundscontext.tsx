// BoundsContext.tsx
'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

interface Bounds {
  southwest: { lat: number; lng: number };
  northeast: { lat: number; lng: number };
}

interface BoundsContextProps {
  bounds: Bounds | null;
  setBounds: (newBounds: Bounds) => void;
}

const BoundsContext = createContext<BoundsContextProps | undefined>(undefined);

export const BoundsProvider = ({ children }: { children: React.ReactNode }) => {
  const [bounds, setBoundsState] = useState<Bounds | null>(null);

  const setBounds = useCallback((newBounds: Bounds) => {
    setBoundsState(newBounds);
  }, []);

  return (
    <BoundsContext.Provider value={{ bounds, setBounds }}>
      {children}
    </BoundsContext.Provider>
  );
};

export const useBounds = () => {
  const context = useContext(BoundsContext);
  if (!context) {
    throw new Error('useBounds must be used within a BoundsProvider');
  }
  return context;
};
