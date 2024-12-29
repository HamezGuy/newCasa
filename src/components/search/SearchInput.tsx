'use client';

import { useBounds } from '@/components/search/boundscontext';
import { Button, MantineSize, Modal, TextInput } from '@mantine/core';
import axios from 'axios';
import debounce from 'lodash/debounce';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { useGeocode } from './GeocodeContext';

// Utility to remove trailing ", USA" or other display suffixes
function sanitizeAddress(address: string): string {
  return address.replace(/,\s*USA\s*$/i, '').trim();
}

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
  const { setBounds } = useBounds();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);

  // Used to store the suggestions returned by /api/v1/autocomplete
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupSuggestions, setPopupSuggestions] = useState<any[]>([]);

  // We'll store an ID each time we request suggestions to avoid race conditions
  const requestIdRef = useRef<number>(0);

  // This set will contain addresses we've already attempted to geocode
  // so we don't keep re-trying them in an infinite loop.
  const triedAddressesRef = useRef<Set<string>>(new Set());

  // ----------------------------------
  // Debounced Autocomplete
  // ----------------------------------
  const fetchSuggestions = useCallback(
    debounce(async (input: string, requestId: number) => {
      if (!input || input.length < 3) {
        console.log('Not enough input length for suggestions (min 3 chars).');
        setSuggestions([]);
        return;
      }
      if (!/^[a-zA-Z0-9\s,]+$/.test(input)) {
        console.warn('Invalid input for autocomplete:', input);
        setSuggestions([]);
        return;
      }

      console.log(`[Autocomplete] Fetching suggestions for "${input}". RequestId=${requestId}`);
      try {
        const response = await axios.get('/api/v1/autocomplete', {
          params: { input, types: '(regions)' },
        });

        // Race-condition check
        const currentValue = inputRef.current?.value || '';
        if (requestId !== requestIdRef.current) {
          console.log('[Autocomplete] Old response, ignoring results.');
          return;
        }
        if (response.data.status === 'OK' && response.data.predictions.length > 0) {
          // If the user changed input in the meantime, skip
          if (currentValue.startsWith(input)) {
            setSuggestions(response.data.predictions);
          } else {
            console.log('[Autocomplete] Current input does not match old response, ignoring.');
          }
        } else {
          console.warn('No autocomplete suggestions found for input:', input);
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Error fetching autocomplete suggestions:', error);
        setSuggestions([]);
      }
    }, 300),
    []
  );

  // ----------------------------------
  // Validate (Geocode) the Address
  // ----------------------------------
  const validateAddress = async (originalAddress: string) => {
    const address = sanitizeAddress(originalAddress);
    console.log('[SearchInput] validateAddress =>', address);

    // If we already tried this exact address, skip to avoid infinite loop
    if (triedAddressesRef.current.has(address)) {
      console.warn(`[SearchInput] We already tried geocoding "${address}" — skipping to prevent loop`);
      return;
    }
    triedAddressesRef.current.add(address);

    setLoading(true);

    try {
      // 1) Call your /api/v1/geocode
      const response = await axios.get('/api/v1/geocode', { params: { address } });
      console.log('[SearchInput] Geocode API response =>', response.data);

      // Google’s normal shape => { status: 'OK', results: [...] }
      // If your endpoint returns an array, adapt accordingly
      const apiData = response.data;

      if (apiData.status === 'OK' && apiData.results && apiData.results.length > 0) {
        // Typically the best match is the first result
        const geocodeData = apiData.results[0];

        const partialMatch = geocodeData.partial_match;
        if (partialMatch) {
          console.warn(`[SearchInput] Google returned partial_match for "${address}".`);
        }

        // Build a custom object
        const formattedData = {
          location: geocodeData.geometry.location,
          bounds: geocodeData.geometry.viewport,
          formatted_address: geocodeData.formatted_address,
          place_id: geocodeData.place_id,
          address_components: geocodeData.address_components,
        };
        console.log('[SearchInput] Formatted data =>', formattedData);

        // Update global context if we're staying on the same page
        setGeocodeData(formattedData);
        setBounds(formattedData.bounds);

        if (onPlaceSelected) {
          onPlaceSelected(formattedData);
        }

        // 2) Extract info from address_components
        const comps = geocodeData.address_components;
        const zipCode = comps.find((c: any) => c.types.includes('postal_code'))?.long_name;
        const streetName = comps.find((c: any) => c.types.includes('route'))?.long_name;
        const city = comps.find(
          (c: any) => c.types.includes('locality') || c.types.includes('sublocality')
        )?.long_name;
        const county = comps.find((c: any) => c.types.includes('administrative_area_level_2'))
          ?.long_name;

        // 3) Decide which param to use
        if (isRedirectEnabled) {
          if (zipCode) {
            console.log('[SearchInput] Redirecting to "/search?zipCode="', zipCode);
            router.push(`/search?zipCode=${encodeURIComponent(zipCode)}`);
          } else if (city) {
            console.log('[SearchInput] Redirecting to "/search?city="', city);
            router.push(`/search?city=${encodeURIComponent(city)}`);
          } else if (streetName) {
            console.log('[SearchInput] Redirecting to "/search?streetName="', streetName);
            router.push(`/search?streetName=${encodeURIComponent(streetName)}`);
          } else if (county) {
            console.log('[SearchInput] Redirecting to "/search?county="', county);
            router.push(`/search?county=${encodeURIComponent(county)}`);
          } else {
            console.log('[SearchInput] No recognized param => no route param used.');
          }

          // (Optional) Clear the input after successful selection:
          if (inputRef.current) {
            inputRef.current.value = '';
          }
        }
      } else {
        console.warn('[SearchInput] Geocode returned no valid results for =>', address);
        // fallback => fetch popup suggestions
        await fetchPopupSuggestions(address);
      }
    } catch (error) {
      console.error('[SearchInput] Error in validateAddress:', error);
      // fallback => fetch popup suggestions
      await fetchPopupSuggestions(address);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------
  // Fallback Suggestions for Invalid
  // ----------------------------------
  const fetchPopupSuggestions = async (input: string) => {
    console.log('[SearchInput] fetchPopupSuggestions =>', input);

    if (triedAddressesRef.current.has(input)) {
      console.warn(`[SearchInput] Already tried fallback for "${input}" — skipping popup loop`);
      return;
    }
    triedAddressesRef.current.add(input);

    try {
      const response = await axios.get('/api/v1/autocomplete', {
        params: { input, types: '(regions)' },
      });

      if (response.data.status === 'OK' && response.data.predictions.length > 0) {
        console.log('[SearchInput] Popup suggestions =>', response.data.predictions);
        setPopupSuggestions(response.data.predictions);
        setIsPopupOpen(true);
      } else {
        console.warn('[SearchInput] No popup suggestions available for invalid address:', input);
        setPopupSuggestions([]);
        setIsPopupOpen(true);
      }
    } catch (error) {
      console.error('[SearchInput] Error fetching popup suggestions:', error);
      setPopupSuggestions([]);
      setIsPopupOpen(true);
    }
  };

  // ----------------------------------
  // Handling Selected Suggestion
  // ----------------------------------
  const handleSuggestionSelect = (suggestion: any) => {
    console.log('[SearchInput] handleSuggestionSelect =>', suggestion);
    const fullDescription = suggestion.description || '';
    if (inputRef.current) {
      inputRef.current.value = fullDescription;
    }
    // Clear suggestions
    setSuggestions([]);
    setPopupSuggestions([]);
    setIsPopupOpen(false);

    // Now attempt geocoding the selection
    validateAddress(fullDescription);
  };

  // ----------------------------------
  // Actually do the search
  // ----------------------------------
  const handleSearch = () => {
    const val = inputRef.current?.value?.trim();
    if (!val) {
      console.log('[SearchInput] No input to search.');
      return;
    }
    validateAddress(val);
  };

  // ----------------------------------
  // On input change => fetch suggestions
  // ----------------------------------
  const handleInputChange = () => {
    const val = inputRef.current?.value?.trim() || '';
    requestIdRef.current += 1;
    const currentId = requestIdRef.current;
    fetchSuggestions(val, currentId);
  };

  return (
    <div style={{ maxWidth: '1000px', minWidth: '400px', margin: '0 auto', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
        <TextInput
          ref={inputRef}
          placeholder="Enter City, Neighborhood, or ZIP Code"
          size={size}
          onChange={handleInputChange}
          onKeyUp={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
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

      {/* Normal autocomplete dropdown */}
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
          {suggestions.map((item) => (
            <li
              key={item.place_id}
              onClick={() => handleSuggestionSelect(item)}
              style={{
                padding: '10px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                borderBottom: '1px solid #ddd',
              }}
            >
              <strong>{item.structured_formatting.main_text}</strong>{' '}
              <small>{item.structured_formatting.secondary_text}</small>
            </li>
          ))}
        </ul>
      )}

      {/* Invalid address => popup suggestions in a modal */}
      <Modal
        opened={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title="Invalid or Incomplete Address"
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
            {popupSuggestions.map((sug) => (
              <li
                key={sug.place_id}
                onClick={() => handleSuggestionSelect(sug)}
                style={{
                  padding: '10px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  borderBottom: '1px solid #ddd',
                }}
              >
                <strong>{sug.structured_formatting.main_text}</strong>{' '}
                <small>{sug.structured_formatting.secondary_text}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No suggestions found for “{inputRef.current?.value}”.<br />
            Please try a more specific address, city, or ZIP code.
          </p>
        )}
      </Modal>
    </div>
  );
}
