'use client';

import { Button, MantineSize, Modal, TextInput } from '@mantine/core';
import axios from 'axios';
import debounce from 'lodash/debounce';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const cancelTokenSourceRef = useRef<ReturnType<typeof axios.CancelToken.source> | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const [loading, setLoading] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Initialize Google Autocomplete
  const initializeAutocomplete = useCallback(() => {
    if (!autocomplete && inputRef.current && window.google?.maps) {
      const newAutocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['(regions)'],
      });

      newAutocomplete.addListener('place_changed', handlePlaceChanged);
      setAutocomplete(newAutocomplete);
    }
  }, [autocomplete]);

  // Attempt to initialize Google Autocomplete whenever the input is rendered
  useEffect(() => {
    initializeAutocomplete();

    const interval = setInterval(() => {
      if (!autocomplete && window.google?.maps) {
        initializeAutocomplete();
        clearInterval(interval);
      }
    }, 100);

    return () => {
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
      if (cancelTokenSourceRef.current) {
        cancelTokenSourceRef.current.cancel('Component unmounted, cancelling pending requests.');
      }
    };
  }, [initializeAutocomplete, autocomplete]);

  // Handle Google Place selection
  const handlePlaceChanged = async () => {
    if (!autocomplete) return;

    const place = autocomplete.getPlace();

    if (place && place.geometry) {
      const geometry = place.geometry as google.maps.places.PlaceGeometry & {
        bounds?: google.maps.LatLngBounds;
      };

      const inputValue = place.formatted_address || inputRef.current?.value;

      if (pathname === '/search') {
        onPlaceSelected?.({
          bounds: geometry.bounds || geometry.viewport,
          geometry,
        });
      } else {
        router.push(`/search?s=${inputValue}`);
      }
    } else {
      openSuggestionsPopup();
    }
  };

  // Fetch suggestions via API with debounced function
  const openSuggestionsPopup = useCallback(
    debounce(async () => {
      if (!inputRef.current?.value) return;

      setLoading(true);

      if (cancelTokenSourceRef.current) {
        cancelTokenSourceRef.current.cancel('New request initiated.');
      }

      const cancelTokenSource = axios.CancelToken.source();
      cancelTokenSourceRef.current = cancelTokenSource;

      try {
        const response = await axios.get('/api/v1/autocomplete', {
          params: { input: inputRef.current.value, types: '(regions)' },
          cancelToken: cancelTokenSource.token,
        });

        if (response.data.status === 'OK' && response.data.predictions.length > 0) {
          setSuggestions(response.data.predictions);
        } else {
          setSuggestions([]);
        }
      } catch (error: any) {
        console.error('Error fetching autocomplete suggestions:', error);
      } finally {
        setLoading(false);
        setIsPopupOpen(true);
      }
    }, 300),
    []
  );

  // Handle suggestion selection from the modal
  const handleSuggestionSelect = async (suggestion: any) => {
    setIsPopupOpen(false);
  
    if (inputRef.current) {
      inputRef.current.value = suggestion.description; // Populate input with selected suggestion
    }
  
    try {
      const response = await axios.get(`/api/v1/geocode`, {
        params: { address: suggestion.description },
      });
  
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const geometry = response.data.results[0].geometry;
  
        if (pathname === '/search') {
          onPlaceSelected?.({
            bounds: geometry.bounds || geometry.viewport,
            geometry,
          });
        } else {
          router.push(`/search?s=${suggestion.description}`);
        }
      }
    } catch (error) {
      console.error('Error fetching geocoding data for suggestion:', error);
    }
  };  

  return (
    <div style={{ maxWidth: '1000px', minWidth: '400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
        <TextInput
          ref={inputRef}
          defaultValue={searchParams.get('s') || ''}
          placeholder="Enter City, ZIP Code, or Address"
          size={size}
          onKeyUp={(e) => e.key === 'Enter' && handlePlaceChanged()}
          style={{
            flex: 1,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          }}
        />
        <Button
          variant="filled"
          loading={isLoading || loading}
          onClick={handlePlaceChanged}
          size={size}
          style={{
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
          }}
        >
          Search
        </Button>
      </div>

      <Modal
        opened={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title="Select a Valid Location"
        overlayProps={{
          color: 'rgba(0, 0, 0, 0.5)',
          blur: 3,
        }}
      >
        {loading ? (
          <p className="text-center text-gray-500 mt-4">Loading suggestions...</p>
        ) : suggestions.length > 0 ? (
          <ul
            style={{
              listStyleType: 'none',
              padding: 0,
              margin: 0,
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.place_id}
                onClick={() => handleSuggestionSelect(suggestion)}
                style={{
                  padding: '10px',
                  borderBottom: '1px solid #ddd',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                className="hover:bg-gray-200"
              >
                <strong>{suggestion.structured_formatting.main_text}</strong>{' '}
                <small>{suggestion.structured_formatting.secondary_text}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p>No valid locations found. Please try again.</p>
        )}
      </Modal>
    </div>
  );
}
