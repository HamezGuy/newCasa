'use client';

import { useSearchParams } from 'next/navigation'; // Updated imports
import { useEffect, useState } from 'react';
import SearchInput from './SearchInput';
import style from './SearchResults.module.css';
import { SearchResultsMap } from './SearchResultsMap';

// Removed `PropertyList` and `paragonApiClient` imports

interface SearchResultsProps {
  query: { zipCode?: string; filters?: any }; // Adjust the query type as needed
}

function SearchResults({ query }: SearchResultsProps) {
  const searchParams = useSearchParams(); // Replacement for router.query
  // const [properties, setProperties] = useState<IParagonProperty[]>([]); // Commented out
  const [loading, setLoading] = useState(true);
  const [selectedGeocodeData, setSelectedGeocodeData] = useState<any | null>(null);

  // Removed fetchProperties logic
  useEffect(() => {
    setLoading(false); // Set loading to false since no properties are being fetched
  }, []);

  // Handle place selection from SearchInput
  const handlePlaceSelected = (geocodeData: any) => {
    console.log('Received geocode data from SearchInput:', geocodeData);

    if (!geocodeData?.geometry?.location || !geocodeData?.geometry?.viewport) {
      console.error('Invalid geocode data received:', geocodeData);
      return;
    }

    const formattedData = {
      location: {
        lat: geocodeData.geometry.location.lat,
        lng: geocodeData.geometry.location.lng,
      },
      bounds: {
        northeast: {
          lat: geocodeData.geometry.viewport.northeast.lat,
          lng: geocodeData.geometry.viewport.northeast.lng,
        },
        southwest: {
          lat: geocodeData.geometry.viewport.southwest.lat,
          lng: geocodeData.geometry.viewport.southwest.lng,
        },
      },
      formatted_address: geocodeData.formatted_address,
      place_id: geocodeData.place_id,
    };

    console.log('Formatted geocode data to set:', formattedData);
    setSelectedGeocodeData(formattedData);
  };

  // Parse geocode data from the searchParams
  useEffect(() => {
    const parseGeocode = () => {
      try {
        const geocode = searchParams.get('geocode'); // Fetch from searchParams
        if (geocode) {
          console.log('Raw geocode from query:', geocode); // Log unparsed geocode data
          const parsedGeocodeData = JSON.parse(decodeURIComponent(geocode));
          console.log('Parsed geocode data from query:', parsedGeocodeData);
          setSelectedGeocodeData(parsedGeocodeData);
        } else {
          console.warn('No geocode data found in search params.');
        }
      } catch (error) {
        console.error('Error parsing geocode data from search params:', error);
      }
    };

    parseGeocode(); // Parse on mount and when searchParams updates
  }, [searchParams]);

  // Debugging state updates
  useEffect(() => {
    console.log('Updated selectedGeocodeData in SearchResults:', selectedGeocodeData);
  }, [selectedGeocodeData]);

  // Logging when rendering decisions are made
  if (loading) {
    console.log('Loading state: properties are being fetched.');
    return <div>Loading...</div>;
  }
  // Commented out properties logic
  // if (!properties || properties.length === 0) {
  //   console.log('No properties found for the current query.');
  //   return <div>Nothing found</div>;
  // }

  return (
    <div className={`${style.searchResults} md:flex`}>
      {/* Search Input */}
      <div className="p-4">
        <SearchInput
          onPlaceSelected={handlePlaceSelected}
          isLoading={loading}
          isRedirectEnabled={false} // Prevent navigation
        />
      </div>

      {/* Map View */}
      <div className={`${style.searchResultsMap} relative flex-auto md:basis-7/12`}>
        {selectedGeocodeData ? (
          <SearchResultsMap
            properties={[]} // Pass an empty array to avoid breaking
            selectedGeocodeData={selectedGeocodeData}
          />
        ) : (
          <div className="p-4 text-center text-gray-500">
            Enter a location to view results on the map.
          </div>
        )}
      </div>

      {/* Property List - Commented out */}
      {/* <div className="basis-5/12 overflow-y-scroll">
        <PropertyList properties={properties} reduced={true} className="p-4" />
      </div> */}
    </div>
  );
}

export default SearchResults;
