'use client';

import SearchInput from '@/components/core/SearchInput';
import { ResultsMap } from '@/components/search/SearchResultsMap';
import { lazy, useState } from 'react';

// Lazy load the SearchResults component
const SearchResults = lazy(() => import('@/components/search/SearchResults'));

export default function Search({ searchParams }: { searchParams?: any }) {
  const [selectedGeometry, setSelectedGeometry] = useState<{
    bounds?: google.maps.LatLngBounds;
    polygonCoords?: google.maps.LatLngLiteral[];
  } | undefined>(undefined);

  const handlePlaceSelected = (geometry: any) => {
    const boundsLiteral = geometry.geometry?.bounds;

    if (boundsLiteral) {
      const bounds = new google.maps.LatLngBounds(
        boundsLiteral.southwest,
        boundsLiteral.northeast
      );

      const polygonCoords = [
        bounds.getSouthWest().toJSON(),
        bounds.getNorthEast().toJSON(),
      ];

      setSelectedGeometry({ bounds, polygonCoords });
    } else {
      setSelectedGeometry(undefined);
    }
  };

  return (
    <main>
      <div className="flex flex-row flex-wrap gap-3 w-full items-center py-2 px-4">
        <SearchInput size="sm" onPlaceSelected={handlePlaceSelected} />
      </div>

      <ResultsMap properties={[]} selectedGeometry={selectedGeometry} />
    </main>
  );
}
