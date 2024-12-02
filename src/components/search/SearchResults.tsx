'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useGeocode } from './GeocodeContext'; // Correct import
import SearchInput from './SearchInput';
import style from './SearchResults.module.css';
import { SearchResultsMap } from './SearchResultsMap';

interface SearchResultsProps {
  query: { zipCode?: string; filters?: any };
}

function SearchResults({ query }: SearchResultsProps) {
  const searchParams = useSearchParams();
  const { setGeocodeData } = useGeocode(); // Only need `setGeocodeData`
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handlePlaceSelected = (newGeocodeData: any) => {
    console.log('Received geocode data from SearchInput:', newGeocodeData);

    if (!newGeocodeData?.geometry?.location || !newGeocodeData?.geometry?.viewport) {
      console.error('Invalid geocode data received:', newGeocodeData);
      return;
    }

    const formattedData = {
      location: {
        lat: newGeocodeData.geometry.location.lat,
        lng: newGeocodeData.geometry.location.lng,
      },
      bounds: {
        northeast: {
          lat: newGeocodeData.geometry.viewport.northeast.lat,
          lng: newGeocodeData.geometry.viewport.northeast.lng,
        },
        southwest: {
          lat: newGeocodeData.geometry.viewport.southwest.lat,
          lng: newGeocodeData.geometry.viewport.southwest.lng,
        },
      },
      formatted_address: newGeocodeData.formatted_address,
      place_id: newGeocodeData.place_id,
    };

    console.log('Formatted geocode data to set:', formattedData);
    setGeocodeData(formattedData);
  };

  useEffect(() => {
    const parseGeocode = () => {
      try {
        const geocode = searchParams.get('geocode');
        if (geocode) {
          console.log('Raw geocode from query:', geocode);
          const parsedGeocodeData = JSON.parse(decodeURIComponent(geocode));
          console.log('Parsed geocode data from query:', parsedGeocodeData);
          setGeocodeData(parsedGeocodeData);
        } else {
          console.warn('No geocode data found in search params.');
        }
      } catch (error) {
        console.error('Error parsing geocode data from search params:', error);
      }
    };

    parseGeocode();
  }, [searchParams, setGeocodeData]);

  if (loading) {
    console.log('Loading state: properties are being fetched.');
    return <div>Loading...</div>;
  }

  return (
    <div className={`${style.searchResults} md:flex`}>
      <div className="p-4">
        <SearchInput
          onPlaceSelected={handlePlaceSelected}
          isLoading={loading}
          isRedirectEnabled={false}
        />
      </div>

      <div className={`${style.searchResultsMap} relative flex-auto md:basis-7/12`}>
        <SearchResultsMap properties={[]} /> {/* Removed `selectedGeocodeData` prop */}
      </div>
    </div>
  );
}

export default SearchResults;
