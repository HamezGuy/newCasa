'use client';

import { Button, MantineSize, TextInput } from '@mantine/core';
import { Autocomplete, LoadScript } from '@react-google-maps/api';
import axios from 'axios';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';

export default function SearchInput({
  isLoading,
  size = 'md',
  onPlaceSelected,
}: {
  isLoading?: boolean;
  size?: MantineSize;
  onPlaceSelected?: (geometry: any) => void;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loading, setLoading] = useState(false);

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API;
  console.log("starting " + GOOGLE_MAPS_API_KEY);
  
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is missing. Check your .env.local configuration.');
    return <p>Error: Google Maps API key is not provided</p>;
  }

  const handleSearch = async () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      const inputValue = place?.formatted_address || inputRef.current?.value;

      if (!inputValue) {
        console.warn('No input value or place selected.');
        return;
      }

      setLoading(true);

      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json`,
          {
            params: {
              address: inputValue,
              key: GOOGLE_MAPS_API_KEY,
            },
          }
        );

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const result = response.data.results[0];
          const geometry = result.geometry;

          if (pathname === '/search') {
            // Update map and filters without refreshing the page
            onPlaceSelected?.({
              bounds: geometry.bounds || geometry.viewport,
              geometry,
            });
          } else {
            // Redirect to search page with query as URL parameter
            router.push(`/search?s=${inputValue}`);
          }
        } else {
          console.warn('No results found for the provided input.');
        }
      } catch (error) {
        console.error('Error fetching geocoding data:', error);
      } finally {
        setLoading(false);
      }
    } else {
      console.error('Autocomplete is not initialized.');
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={['places']}
      onError={(error) =>
        console.error('Google Maps LoadScript error:', error)
      }
    >
      <Autocomplete
        onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
        onPlaceChanged={handleSearch}
      >
        <TextInput
          ref={inputRef}
          defaultValue={searchParams.get('s') || ''}
          placeholder="Enter City, ZIP Code, or Address"
          className="flex-grow"
          size={size}
          onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
          rightSection={
            <Button
              variant="filled"
              loading={isLoading || loading}
              onClick={handleSearch}
              size={size}
            >
              Search
            </Button>
          }
        />
      </Autocomplete>
    </LoadScript>
  );
}
