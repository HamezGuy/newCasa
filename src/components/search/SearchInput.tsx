"use client";

import { Button, MantineSize, Modal, TextInput } from "@mantine/core";
import axios from "axios";
import debounce from "lodash/debounce";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useMemo, useEffect } from "react";
import { useGeocode } from "./GeocodeContext";
import { useBounds } from "./boundscontext";

// Utility to remove trailing ", USA"
function sanitizeAddress(address: string): string {
  return address.replace(/,\s*USA\s*$/i, "").trim();
}

interface ISearchFiltersData {
  minPrice?: string;
  maxPrice?: string;
  types?: string[];
  minRooms?: string;
  maxRooms?: string;
  radius?: number;
}

interface SearchInputProps {
  defaultValue?: string;
  isLoading?: boolean;
  size?: MantineSize;
  onPlaceSelected?: (geocodeData: any) => void;
  isRedirectEnabled?: boolean;
  filters?: ISearchFiltersData;
}

export default function SearchInput({
  defaultValue = "",
  isLoading,
  size = "md",
  onPlaceSelected,
  isRedirectEnabled = true,
  filters,
}: SearchInputProps) {
  const router = useRouter();
  const { setGeocodeData } = useGeocode();
  const { setBounds } = useBounds();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupSuggestions, setPopupSuggestions] = useState<any[]>([]);
  const requestIdRef = useRef<number>(0);
  const [isAddressInput, setIsAddressInput] = useState(false);

  useEffect(() => {
    if (inputRef.current && defaultValue) {
      inputRef.current.value = defaultValue;
    }
  }, [defaultValue]);

  // Helper to detect if input looks like an address
  const detectIfAddress = (input: string): boolean => {
    // Look for patterns like numbers followed by words, or street types
    const addressPatterns = [
      /^\d+\s+[a-zA-Z]/, // Starts with numbers followed by words
      /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|circle|cir|court|ct|place|pl|boulevard|blvd)\b/i, // Contains street types
    ];

    return addressPatterns.some((pattern) => pattern.test(input));
  };

  // ----------------------------------------
  // Fetch suggestions (autocomplete)
  // ----------------------------------------
  const fetchSuggestionsFn = useCallback(
    async (input: string, requestId: number) => {
      if (!input || input.length < 3) {
        setSuggestions([]);
        return;
      }
      if (!/^[a-zA-Z0-9\s,]+$/.test(input)) {
        setSuggestions([]);
        return;
      }

      // Detect if input looks like an address
      const isAddress = detectIfAddress(input);
      setIsAddressInput(isAddress);

      try {
        const response = await axios.get("/api/v1/autocomplete", {
          params: {
            input,
            // If it looks like an address, use address type
            types: isAddress ? "address" : "(regions)",
          },
        });

        // Race-condition check
        const currentValue = inputRef.current?.value || "";
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (response.data.status === "OK" && response.data.predictions.length > 0) {
          if (currentValue.startsWith(input)) {
            setSuggestions(response.data.predictions);
          }
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        setSuggestions([]);
      }
    },
    []
  );

  const fetchSuggestions = useMemo(() => {
    return debounce(fetchSuggestionsFn, 300);
  }, [fetchSuggestionsFn]);

  // ----------------------------------------
  // Validate the geocode result
  // ----------------------------------------
  function hasRecognizedType(addrComponents: any[]): boolean {
    // We consider it valid if there's at least one component with these types:
    // - postal_code  (ZIP)
    // - locality     (City)
    // - admin_area2  (County)
    // - street_number (Address)
    // or if the entire geometry is recognized as an address
    for (const comp of addrComponents) {
      const typesArr = comp.types || [];
      if (
        typesArr.includes("postal_code") ||
        typesArr.includes("locality") ||
        typesArr.includes("administrative_area_level_2") ||
        typesArr.includes("street_number")
      ) {
        return true;
      }
    }
    return false;
  }

  // ----------------------------------------
  // If the user input doesn't yield a recognized type,
  // then we open the popup and do NOT redirect
  // ----------------------------------------
  const validateAddress = async (originalAddress: string) => {
    const address = sanitizeAddress(originalAddress);
    setLoading(true);

    try {
      const response = await axios.get("/api/v1/geocode", { params: { address } });
      const apiData = response.data;

      if (apiData.status === "OK" && apiData.results && apiData.results.length > 0) {
        const geocodeData = apiData.results[0];
        console.log("Geocode result types:", geocodeData.types);

        // Check if recognized: city, county, zip, or full address
        if (!hasRecognizedType(geocodeData.address_components || [])) {
          // not recognized => show popup
          console.log("Not recognized as city/zip/county/street => show popup");
          await fetchPopupSuggestions(address);
          setLoading(false);
          return;
        }

        // If recognized, proceed
        const formattedData = {
          location: geocodeData.geometry.location,
          bounds: geocodeData.geometry.viewport,
          formatted_address: geocodeData.formatted_address,
          place_id: geocodeData.place_id,
          address_components: geocodeData.address_components,
          types: geocodeData.types, // Include types in the geocode data
        };

        setGeocodeData(formattedData);
        setBounds(formattedData.bounds);
        onPlaceSelected?.(formattedData);
        setSuggestions([]);

        if (isRedirectEnabled) {
          const comps = geocodeData.address_components || [];
          const zipCode = comps.find((c: any) => c.types.includes("postal_code"))?.long_name;
          const route = comps.find((c: any) => c.types.includes("route"))?.long_name;
          const city = comps.find(
            (c: any) => c.types.includes("locality") || c.types.includes("sublocality")
          )?.long_name;
          const county = comps.find((c: any) =>
            c.types.includes("administrative_area_level_2")
          )?.long_name;
          const streetNumber = comps.find((c: any) => c.types.includes("street_number"))?.long_name;

          const urlParams = new URLSearchParams();
          urlParams.set("searchTerm", originalAddress);
          urlParams.set("geocode", encodeURIComponent(JSON.stringify(formattedData)));

          // Check if this is a street address
          const isStreetAddress =
            geocodeData.types &&
            (geocodeData.types.includes("street_address") ||
              geocodeData.types.includes("premise"));

          // If we have a street number and route or it's explicitly a street address or input looks like address
          if ((streetNumber && route) || isStreetAddress || isAddressInput) {
            console.log("Detected as full address - using address search");
            urlParams.set("address", geocodeData.formatted_address);
          } else if (zipCode) {
            urlParams.set("zipCode", zipCode);
          } else if (city) {
            urlParams.set("city", city);
          } else if (route) {
            urlParams.set("streetName", route);
          } else if (county) {
            urlParams.set("county", county);
          }

          // Include user filters
          if (filters) {
            if (filters.minPrice) urlParams.set("minPrice", filters.minPrice);
            if (filters.maxPrice) urlParams.set("maxPrice", filters.maxPrice);
            if (filters.minRooms) urlParams.set("minRooms", filters.minRooms);
            if (filters.maxRooms) urlParams.set("maxRooms", filters.maxRooms);

            // propertyType=... for each type
            if (filters.types && filters.types.length > 0) {
              filters.types.forEach((t) => {
                urlParams.append("propertyType", t);
              });
            }
          }

          router.push(`/search?${urlParams.toString()}`);

          // Clear input
          if (inputRef.current) {
            inputRef.current.value = "";
          }
        }
      } else {
        // No valid geocode => fetch popups
        await fetchPopupSuggestions(address);
      }
    } catch (error) {
      // Possibly a fetch error => show popups
      await fetchPopupSuggestions(address);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  // If the geocode fails or partial => fetch possible suggestions
  // and show the popup
  // ----------------------------------------
  const fetchPopupSuggestions = async (input: string) => {
    try {
      // Detect if input looks like an address for better suggestions
      const isAddress = detectIfAddress(input);

      const response = await axios.get("/api/v1/autocomplete", {
        params: {
          input,
          types: isAddress ? "address" : "(regions)",
        },
      });

      if (response.data.status === "OK" && response.data.predictions.length > 0) {
        setPopupSuggestions(response.data.predictions);
        setIsPopupOpen(true);
      } else {
        setPopupSuggestions([]);
        setIsPopupOpen(true);
      }
    } catch (error) {
      setPopupSuggestions([]);
      setIsPopupOpen(true);
    }
  };

  // ----------------------------------------
  // When user clicks a suggestion from the popup
  // => re-validate that address
  // ----------------------------------------
  const handleSuggestionSelect = (suggestion: any) => {
    const fullDescription = suggestion.description || "";
    if (inputRef.current) {
      inputRef.current.value = fullDescription;
    }
    setSuggestions([]);
    setPopupSuggestions([]);
    setIsPopupOpen(false);

    // Check if this is an address suggestion based on types
    if (suggestion.types) {
      const addressTypes = ["street_address", "premise", "address"];
      const isAddress = addressTypes.some((type) => suggestion.types.includes(type));
      setIsAddressInput(isAddress);
    } else {
      // If no types, check the description
      setIsAddressInput(detectIfAddress(fullDescription));
    }

    validateAddress(fullDescription);
  };

  // ----------------------------------------
  // Handler for search button
  // ----------------------------------------
  const handleSearch = () => {
    const val = inputRef.current?.value?.trim();
    if (val) {
      // Check if input looks like an address before validating
      setIsAddressInput(detectIfAddress(val));
      validateAddress(val);
    }
  };

  const handleInputChange = () => {
    const val = inputRef.current?.value?.trim() || "";
    requestIdRef.current += 1;
    const currentId = requestIdRef.current;
    fetchSuggestions(val, currentId);
  };

  return (
    <div
      style={{
        maxWidth: "1000px",
        width: "100%",
        margin: "0 auto",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch", width: "100%" }}>
        <TextInput
          ref={inputRef}
          placeholder="Enter City, Neighborhood, ZIP Code, or Address"
          size={size}
          onChange={handleInputChange}
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          style={{
            flex: 1,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            fontSize: "16px", // ensures iOS won't auto-zoom
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

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            listStyleType: "none",
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            padding: 0,
            margin: 0,
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 1000,
          }}
        >
          {suggestions.map((item) => (
            <li
              key={item.place_id}
              onClick={() => handleSuggestionSelect(item)}
              style={{
                padding: "10px",
                cursor: "pointer",
                transition: "backgroundColor 0.2s",
                borderBottom: "1px solid #ddd",
              }}
            >
              <strong>{item.structured_formatting.main_text}</strong>{" "}
              <small>{item.structured_formatting.secondary_text}</small>
            </li>
          ))}
        </ul>
      )}

      {/* Popup modal for incomplete/invalid addresses */}
      <Modal
        opened={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title="Invalid or Incomplete Address"
        overlayProps={{
          color: "rgba(0, 0, 0, 0.5)",
          blur: 3,
        }}
      >
        {popupSuggestions.length > 0 ? (
          <ul
            style={{
              listStyleType: "none",
              padding: 0,
              margin: 0,
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {popupSuggestions.map((sug) => (
              <li
                key={sug.place_id}
                onClick={() => handleSuggestionSelect(sug)}
                style={{
                  padding: "10px",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                  borderBottom: "1px solid #ddd",
                }}
              >
                <strong>{sug.structured_formatting.main_text}</strong>{" "}
                <small>{sug.structured_formatting.secondary_text}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No suggestions found for &quot;{inputRef.current?.value}&quot;.<br />
            Please try a more specific address, city, or ZIP code.
          </p>
        )}
      </Modal>
    </div>
  );
}
