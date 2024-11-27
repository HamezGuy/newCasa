'use client';

import { Button, MantineSize, TextInput } from '@mantine/core';
import { Autocomplete, LoadScript } from '@react-google-maps/api';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loading, setLoading] = useState(false);

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API;

  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is missing.');
    return <p>Error: Google Maps API key is not provided</p>;
  }

  const handleSearch = async () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      const inputValue = place?.formatted_address || inputRef.current?.value;

      if (inputValue) {
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

          if (response.data.status === 'OK') {
            const result = response.data.results[0];
            const geometry = result.geometry; // Fetch geometry for bounds/polygon
            const locationType = result.types[0];

            router.replace(`/search?s=${inputValue}`);

            onPlaceSelected?.({
              bounds: geometry.bounds || geometry.viewport,
              locationType,
              geometry,
            });
          }
        } catch (error) {
          console.error('Error fetching geocoding data:', error);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={['places']}>
      <Autocomplete
        onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
        onPlaceChanged={handleSearch}
      >
        <TextInput
          ref={inputRef}
          defaultValue={searchParams.get('s')?.toString()}
          placeholder="City, ZIP, Neighborhood, Address"
          className="flex-grow"
          size={size}
          miw="280"
          maw="500"
          type="text"
          rightSectionWidth="auto"
          data-1p-ignore
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
