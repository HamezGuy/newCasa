'use client';

import PropertyList from '@/components/paragon/PropertyList';
import { useGeocode } from '@/components/search/GeocodeContext'; // Use GeocodeContext
import SearchFilters from '@/components/search/SearchFilters';
import SearchInput from '@/components/search/SearchInput';
import { SearchResultsMap } from '@/components/search/SearchResultsMap';
import { useBounds } from '@/components/search/boundscontext'; // Use BoundsContext
import { useEffect, useRef, useState } from 'react';

export default function Search() {
  const [filteredProperties, setFilteredProperties] = useState([]); // Properties displayed on the map
  const [loading, setLoading] = useState(false);

  const hasFetched = useRef(false); // Prevents duplicate fetches
  const { setGeocodeData } = useGeocode(); // Access GeocodeContext
  const { setBounds } = useBounds(); // Access BoundsContext

  // Fetch properties from API
  const fetchProperties = async (zipCode?: string) => {
    if (hasFetched.current) return; // Avoid unnecessary fetches
    hasFetched.current = true;

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/listings${zipCode ? `?zipCode=${zipCode}` : ''}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched properties:', data);
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
    // Initial fetch of all properties
    fetchProperties();
  }, []);

  // Handle place selection from SearchInput
  const handlePlaceSelected = (geocodeData: any) => {
    if (!geocodeData || !geocodeData.bounds) {
      console.error('Invalid geocode data received:', geocodeData);
      return;
    }

    console.log('Setting geocode data and bounds:', geocodeData);
    setGeocodeData(geocodeData); // Update GeocodeContext
    setBounds(geocodeData.bounds); // Update BoundsContext

    // Fetch properties near the selected location
    const zipCode = geocodeData?.address_components?.find((component: any) =>
      component.types.includes('postal_code')
    )?.long_name;

    if (zipCode) {
      console.log('Fetching properties for zip code:', zipCode);
      fetchProperties(zipCode);
    }
  };

  const handleFiltersUpdate = (filters: any) => {
    console.log('Filters updated:', filters);
    // Logic to apply filters (if necessary)
  };

  return (
    <main className="flex flex-col w-full h-screen">
      {/* Search Bar, Filters */}
      <div className="flex flex-wrap w-full p-4 gap-4 bg-gray-100 shadow-md z-10">
        <SearchInput size="sm" onPlaceSelected={handlePlaceSelected} />
        <SearchFilters onUpdate={handleFiltersUpdate} />
      </div>

      {/* Map and Property List */}
      <div className="flex flex-grow w-full h-full">
        {/* Map View */}
        <div className="w-full lg:w-2/3 h-full">
          <SearchResultsMap properties={filteredProperties} />
        </div>

        {/* Property List */}
        <div className="w-full lg:w-1/3 h-full overflow-y-auto p-4 bg-white shadow-inner">
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
