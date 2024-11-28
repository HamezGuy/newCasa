'use client';

import PropertySearchResultCard from '@/components/paragon/PropertySearchResultCard';
import SearchFilters from '@/components/search/SearchFilters';
import SearchInput from '@/components/search/SearchInput';
import { SearchResultsMap } from '@/components/search/SearchResultsMap';
import { searchQuery } from '@/lib/data';
import IParagonProperty from '@/types/IParagonProperty';
import { useState } from 'react';

export default function Search({ searchParams }: { searchParams?: searchQuery }) {
  const [selectedGeometry, setSelectedGeometry] = useState<{
    bounds?: google.maps.LatLngBounds;
    polygonCoords?: google.maps.LatLngLiteral[];
  } | undefined>(undefined);

  const [filteredProperties, setFilteredProperties] = useState<IParagonProperty[]>([]);

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

  const handleFiltersUpdate = (filters: any) => {
    // Placeholder for applying filters
    console.log('Filters updated:', filters);
  };

  return (
    <main className="flex flex-col w-full h-screen">
      {/* Search Bar and Filters */}
      <div className="flex flex-wrap w-full p-4 gap-4 bg-gray-100 shadow-md z-10">
        <SearchInput size="sm" onPlaceSelected={handlePlaceSelected} />
        <SearchFilters onUpdate={handleFiltersUpdate} />
      </div>

      {/* Map and Property List */}
      <div className="flex flex-col lg:flex-row flex-grow w-full">
        {/* Map View */}
        <div className="w-full lg:w-2/3 h-96 lg:h-full">
          <SearchResultsMap
            properties={filteredProperties}
            selectedGeometry={selectedGeometry}
          />
        </div>

        {/* Property List */}
        <div className="w-full lg:w-1/3 h-full overflow-auto p-4 bg-white shadow-inner">
          {filteredProperties.length > 0 ? (
            filteredProperties.map((property) => (
              <PropertySearchResultCard key={property.ListingId} property={property} />
            ))
          ) : (
            <p className="text-center text-gray-500 mt-4">
              No properties found. Adjust your search or filters.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
