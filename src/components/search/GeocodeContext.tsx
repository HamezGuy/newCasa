'use client';

import { createContext, useContext, useState } from 'react';

interface GeocodeData {
  location: { lat: number; lng: number };
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  formatted_address: string;
  place_id: string;
}

interface GeocodeContextProps {
  geocodeData: GeocodeData | null;
  setGeocodeData: (data: GeocodeData) => void;
}

const GeocodeContext = createContext<GeocodeContextProps | undefined>(undefined);

export const GeocodeProvider = ({ children }: { children: React.ReactNode }) => {
  const [geocodeData, setGeocodeData] = useState<GeocodeData | null>(null);

  return (
    <GeocodeContext.Provider value={{ geocodeData, setGeocodeData }}>
      {children}
    </GeocodeContext.Provider>
  );
};

export const useGeocode = () => {
  const context = useContext(GeocodeContext);
  if (!context) {
    throw new Error('useGeocode must be used within a GeocodeProvider');
  }
  return context;
};
