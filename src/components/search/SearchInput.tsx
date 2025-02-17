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

// ----------------------------------------------------------------
// Component: SearchInput
// ----------------------------------------------------------------
interface SearchInputProps {
  defaultValue?: string;
  isLoading?: boolean;
  size?: MantineSize;
  onPlaceSelected?: (geocodeData: any) => void;
  isRedirectEnabled?: boolean;
}

export default function SearchInput({
  defaultValue = "",
  isLoading,
  size = "md",
  onPlaceSelected,
  isRedirectEnabled = true,
}: SearchInputProps) {
  const router = useRouter();
  const { setGeocodeData } = useGeocode();
  const { setBounds } = useBounds();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  // Invalid address fallback modal
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupSuggestions, setPopupSuggestions] = useState<any[]>([]);

  const requestIdRef = useRef<number>(0);

  useEffect(() => {
    if (inputRef.current && defaultValue) {
      inputRef.current.value = defaultValue;
    }
  }, [defaultValue]);

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

      try {
        const response = await axios.get("/api/v1/autocomplete", {
          params: { input, types: "(regions)" },
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

  const validateAddress = async (originalAddress: string) => {
    const address = sanitizeAddress(originalAddress);
    setLoading(true);

    try {
      const response = await axios.get("/api/v1/geocode", { params: { address } });
      const apiData = response.data;
      if (apiData.status === "OK" && apiData.results && apiData.results.length > 0) {
        const geocodeData = apiData.results[0];
        const formattedData = {
          location: geocodeData.geometry.location,
          bounds: geocodeData.geometry.viewport,
          formatted_address: geocodeData.formatted_address,
          place_id: geocodeData.place_id,
          address_components: geocodeData.address_components,
        };

        setGeocodeData(formattedData);
        setBounds(formattedData.bounds);
        if (onPlaceSelected) onPlaceSelected(formattedData);
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

          const urlParams = new URLSearchParams();
          urlParams.set("searchTerm", originalAddress);
          urlParams.set("geocode", encodeURIComponent(JSON.stringify(formattedData)));

          if (zipCode) urlParams.set("zipCode", zipCode);
          else if (city) urlParams.set("city", city);
          else if (route) urlParams.set("streetName", route);
          else if (county) urlParams.set("county", county);

          router.push(`/search?${urlParams.toString()}`);

          if (inputRef.current) {
            inputRef.current.value = "";
          }
        }
      } else {
        await fetchPopupSuggestions(address);
      }
    } catch (error) {
      await fetchPopupSuggestions(address);
    } finally {
      setLoading(false);
    }
  };

  const fetchPopupSuggestions = async (input: string) => {
    try {
      const response = await axios.get("/api/v1/autocomplete", {
        params: { input, types: "(regions)" },
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

  const handleSuggestionSelect = (suggestion: any) => {
    const fullDescription = suggestion.description || "";
    if (inputRef.current) {
      inputRef.current.value = fullDescription;
    }
    setSuggestions([]);
    setPopupSuggestions([]);
    setIsPopupOpen(false);
    validateAddress(fullDescription);
  };

  const handleSearch = () => {
    const val = inputRef.current?.value?.trim();
    if (val) validateAddress(val);
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
        minWidth: "400px",
        margin: "0 auto",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch", width: "100%" }}>
        <TextInput
          ref={inputRef}
          placeholder="Enter City, Neighborhood, or ZIP Code"
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
            fontSize: "16px",
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
                transition: "background-color 0.2s",
                borderBottom: "1px solid #ddd",
              }}
            >
              <strong>{item.structured_formatting.main_text}</strong>{" "}
              <small>{item.structured_formatting.secondary_text}</small>
            </li>
          ))}
        </ul>
      )}

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
            No suggestions found for “{inputRef.current?.value}”.<br />
            Please try a more specific address, city, or ZIP code.
          </p>
        )}
      </Modal>
    </div>
  );
}
