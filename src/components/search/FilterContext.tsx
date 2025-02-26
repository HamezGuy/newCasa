"use client";

import React, { createContext, useState, useContext } from "react";

// The "shape" of our global filters
interface IFilters {
  minPrice?: string;
  maxPrice?: string;
  types?: string[];
  minRooms?: string;
  maxRooms?: string;
  radius?: number; // NEW: Added radius for address-based searches
}

// Expose these in context
interface IFilterContext {
  filters: IFilters;
  setFilters: React.Dispatch<React.SetStateAction<IFilters>>;
}

// Create an empty default
const FilterContext = createContext<IFilterContext>({
  filters: {},
  setFilters: () => {},
});

// Provider component => wraps your app so filters are stored globally
export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<IFilters>({});

  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

// Easy hook to use in your other components
export function useFilters() {
  return useContext(FilterContext);
}