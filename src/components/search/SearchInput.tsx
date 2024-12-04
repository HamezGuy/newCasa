'use client';

import { useBounds } from '@/components/search/boundscontext'; // Import BoundsContext
import { Button, MantineSize, Modal, TextInput } from '@mantine/core';
import axios from 'axios';
import debounce from 'lodash/debounce';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { useGeocode } from './GeocodeContext';

export default function SearchInput({
  isLoading,
  size = 'md',
  onPlaceSelected,
  isRedirectEnabled = true,
}: {
  isLoading?: boolean;
  size?: MantineSize;
  onPlaceSelected?: (geocodeData: any) => void;
  isRedirectEnabled?: boolean;
}) {
  const router = useRouter();
  const { setGeocodeData } = useGeocode();
  const { setBounds } = useBounds(); // Use BoundsContext to update bounds
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupSuggestions, setPopupSuggestions] = useState<any[]>([]);

  // Debounced function to fetch autocomplete suggestions
  const fetchSuggestions = useCallback(
    debounce(async (input: string) => {
      if (!input) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await axios.get('/api/v1/autocomplete', {
          params: { input, types: '(regions)' },
        });

        if (response.data.status === 'OK' && response.data.predictions.length > 0) {
          setSuggestions(response.data.predictions);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Error fetching autocomplete suggestions:', error);
        setSuggestions([]);
      }
    }, 300),
    []
  );

  // Validate address via geocoding API
  const validateAddress = async (address: string) => {
    try {
      setLoading(true);
      console.log('Validating address:', address);

      const response = await axios.get('/api/v1/geocode', { params: { address } });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const geocodeData = response.data.results[0];
        console.log('Valid Geocode Data:', geocodeData);

        const formattedData = {
          location: {
            lat: geocodeData.geometry.location.lat,
            lng: geocodeData.geometry.location.lng,
          },
          bounds: {
            northeast: geocodeData.geometry.viewport.northeast,
            southwest: geocodeData.geometry.viewport.southwest,
          },
          formatted_address: geocodeData.formatted_address,
          place_id: geocodeData.place_id,
        };

        // Update geocode data and bounds in contexts
        setGeocodeData(formattedData);
        setBounds(formattedData.bounds); // Update bounds in context

        // Pass geocode data to the parent component
        onPlaceSelected?.(formattedData);

        if (isRedirectEnabled) {
          // Navigate to search page with geocode data
          router.push(`/search?geocode=${encodeURIComponent(JSON.stringify(formattedData))}`);
        }
      } else {
        console.warn('Invalid address. Triggering popup suggestions.');
        fetchPopupSuggestions(address);
      }
    } catch (error) {
      console.error('Error validating address:', error);
      fetchPopupSuggestions(address);
    } finally {
      setLoading(false);
    }
  };

  // Fetch suggestions for invalid address in modal
  const fetchPopupSuggestions = async (input: string) => {
    try {
      console.log('Fetching suggestions for invalid address:', input);

      const response = await axios.get('/api/v1/autocomplete', {
        params: { input, types: '(regions)' },
      });

      if (response.data.status === 'OK' && response.data.predictions.length > 0) {
        setPopupSuggestions(response.data.predictions);
        setIsPopupOpen(true);
      } else {
        console.warn('No suggestions available.');
        setPopupSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching popup suggestions:', error);
    }
  };

  // Handle selection from dropdown or modal suggestions
  const handleSuggestionSelect = (suggestion: any) => {
    if (inputRef.current) {
      inputRef.current.value = suggestion.description;
    }
    validateAddress(suggestion.description);
    setSuggestions([]);
    setPopupSuggestions([]);
    setIsPopupOpen(false);
  };

  // Handle search submission
  const handleSearch = () => {
    if (inputRef.current?.value) {
      validateAddress(inputRef.current.value);
    }
  };

  // Handle input change for autofill
  const handleInputChange = () => {
    const input = inputRef.current?.value || '';
    fetchSuggestions(input);
  };

  return (
    <div style={{ maxWidth: '1000px', minWidth: '400px', margin: '0 auto', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
        <TextInput
          ref={inputRef}
          placeholder="Enter City, ZIP Code, or Address"
          size={size}
          onChange={handleInputChange}
          onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
          style={{
            flex: 1,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          }}
        />
        <Button
          variant="filled"
          loading={isLoading || loading}
          onClick={handleSearch}
          size={size}
          style={{
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
          }}
        >
          Search
        </Button>
      </div>

      {suggestions.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            listStyleType: 'none',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            padding: 0,
            margin: 0,
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSuggestionSelect(suggestion)}
              style={{
                padding: '10px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                borderBottom: '1px solid #ddd',
              }}
            >
              <strong>{suggestion.structured_formatting.main_text}</strong>{' '}
              <small>{suggestion.structured_formatting.secondary_text}</small>
            </li>
          ))}
        </ul>
      )}

      <Modal
        opened={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title="Invalid Address"
        overlayProps={{
          color: 'rgba(0, 0, 0, 0.5)',
          blur: 3,
        }}
      >
        {popupSuggestions.length > 0 ? (
          <ul
            style={{
              listStyleType: 'none',
              padding: 0,
              margin: 0,
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {popupSuggestions.map((suggestion) => (
              <li
                key={suggestion.place_id}
                onClick={() => handleSuggestionSelect(suggestion)}
                style={{
                  padding: '10px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  borderBottom: '1px solid #ddd',
                }}
              >
                <strong>{suggestion.structured_formatting.main_text}</strong>{' '}
                <small>{suggestion.structured_formatting.secondary_text}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p>No suggestions available. Please try again.</p>
        )}
      </Modal>
    </div>
  );
}
