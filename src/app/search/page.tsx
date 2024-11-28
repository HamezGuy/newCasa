'use client';

import PropertyList from '@/components/paragon/PropertyList';
import SearchFilters from '@/components/search/SearchFilters';
import SearchInput from '@/components/search/SearchInput';
import { SearchResultsMap } from '@/components/search/SearchResultsMap';
import { useEffect, useState } from 'react';

export default function Search() {
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [selectedGeometry, setSelectedGeometry] = useState<{
    bounds?: google.maps.LatLngBounds;
    polygonCoords?: google.maps.LatLngLiteral[];
  } | undefined>(undefined); // Changed from null to undefined
  const [loading, setLoading] = useState(false);

  const fetchProperties = async (zipCode?: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/listings${zipCode ? `?zipCode=${zipCode}` : ''}`);
      if (response.ok) {
        const data = await response.json();
        setFilteredProperties(data);
      } else {
        console.error('Failed to fetch properties:', await response.text());
        setFilteredProperties([]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      setFilteredProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch all properties when the component mounts
    fetchProperties();
  }, []);

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
      setSelectedGeometry(undefined); // Use undefined instead of null
    }
  };

  const handleFiltersUpdate = (filters: any) => {
    console.log('Filters updated:', filters);
    // Apply filters logic here (if applicable)
  };

  const handleTestingButtonClick = async () => {
    console.log('Fetching properties for zip code 53715...');
    await fetchProperties('53715');
  };

  return (
    <main className="flex flex-col w-full h-screen">
      {/* Search Bar, Filters, and Testing Button */}
      <div className="flex flex-wrap w-full p-4 gap-4 bg-gray-100 shadow-md z-10">
        <SearchInput size="sm" onPlaceSelected={handlePlaceSelected} />
        <SearchFilters onUpdate={handleFiltersUpdate} />
        <button
          onClick={handleTestingButtonClick}
          className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600"
        >
          Testing
        </button>
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
          {loading ? (
            <p className="text-center text-gray-500 mt-4">Loading properties...</p>
          ) : filteredProperties.length > 0 ? (
            <PropertyList properties={filteredProperties} />
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
