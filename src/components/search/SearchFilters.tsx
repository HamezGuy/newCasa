"use client";

import { Button, Checkbox, Popover, TextInput, Stack, Slider, Text } from "@mantine/core";
import { useState, useEffect } from "react";
import { useFilters } from "./FilterContext";
import { useSearchParams, useRouter } from "next/navigation"; // CHANGED
// ^ we added useRouter to allow navigation

export default function SearchFilters({ isLoading }: { isLoading?: boolean }) {
  const { filters, setFilters } = useFilters();
  const searchParams = useSearchParams();
  const router = useRouter(); // CHANGED
  const isAddressSearch = searchParams.has("address");

  // Local states
  const [minPrice, setMinPrice] = useState(filters.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice ?? "");
  const [types, setTypes] = useState<string[]>(filters.types ?? []);
  const [minRooms, setMinRooms] = useState(filters.minRooms ?? "");
  const [maxRooms, setMaxRooms] = useState(filters.maxRooms ?? "");
  const [radius, setRadius] = useState(filters.radius ?? 1);

  useEffect(() => {
    setMinPrice(filters.minPrice ?? "");
    setMaxPrice(filters.maxPrice ?? "");
    setTypes(filters.types ?? []);
    setMinRooms(filters.minRooms ?? "");
    setMaxRooms(filters.maxRooms ?? "");
    setRadius(filters.radius ?? 1);
  }, [filters]);

  const [opened, setOpened] = useState(false);

  const applyFilters = () => {
    setFilters({
      minPrice,
      maxPrice,
      types,
      minRooms,
      maxRooms,
      radius,
    });
    setOpened(false);
    
    // If user is on an address search, we also update radius in URL
    if (isAddressSearch) {
      const url = new URL(window.location.href);
      url.searchParams.set("radius", radius.toString());
      window.history.replaceState({}, "", url.toString());
      
      // Reload so new radius is applied
      window.location.reload();
    }
  };

  // CHANGED: new "All Properties" button
  const handleAllPropertiesClick = () => {
    const url = new URL(window.location.href);

    // If we already have allProperties=true, do nothing
    if (url.searchParams.get("allProperties") === "true") {
      return;
    }

    // Remove other search params so it doesn't conflict
    url.searchParams.delete("zipCode");
    url.searchParams.delete("address");
    url.searchParams.delete("city");
    url.searchParams.delete("county");
    url.searchParams.delete("streetName");
    url.searchParams.delete("propertyId");
    url.searchParams.delete("agentName");

    // Clear out filters in the URL if you want
    url.searchParams.delete("minPrice");
    url.searchParams.delete("maxPrice");
    url.searchParams.delete("minRooms");
    url.searchParams.delete("maxRooms");
    url.searchParams.delete("propertyType");
    url.searchParams.delete("radius");

    // Finally set allProperties=true
    url.searchParams.set("allProperties", "true");

    // Navigate there
    router.push(url.toString());
  };

  return (
    <div className="flex items-center gap-2">
      <Popover
        opened={opened}
        onClose={() => setOpened(false)}
        position="bottom"
        withArrow
        shadow="md"
        width={300}
      >
        <Popover.Target>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpened((o) => !o)}
            loading={isLoading}
          >
            More Filters
          </Button>
        </Popover.Target>

        <Popover.Dropdown>
          <Stack style={{ gap: "8px" }}>
            <TextInput
              value={minPrice}
              label="Minimum Price"
              placeholder="Min Price"
              type="number"
              size="xs"
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <TextInput
              value={maxPrice}
              label="Maximum Price"
              placeholder="Max Price"
              type="number"
              size="xs"
              onChange={(e) => setMaxPrice(e.target.value)}
            />

            <Checkbox.Group
              value={types}
              onChange={(vals: string[]) => setTypes(vals)}
              label="Property Type"
            >
              <Checkbox value="Residential" label="House" />
              <Checkbox value="Condominium" label="Condominium" />
              <Checkbox value="Land" label="Land" />
              <Checkbox value="Multi Family" label="Multi-family" />
              <Checkbox value="Commercial Sale" label="Commercial" />
            </Checkbox.Group>

            <TextInput
              value={minRooms}
              label="Min. Rooms"
              type="number"
              size="xs"
              onChange={(e) => setMinRooms(e.target.value)}
            />
            <TextInput
              value={maxRooms}
              label="Max. Rooms"
              type="number"
              size="xs"
              onChange={(e) => setMaxRooms(e.target.value)}
            />
            
            {isAddressSearch && (
              <>
                <Text size="sm">Search Radius (miles)</Text>
                <Slider
                  value={radius}
                  onChange={setRadius}
                  min={0.5}
                  max={10}
                  step={0.5}
                  marks={[
                    { value: 0.5, label: '0.5' },
                    { value: 5, label: '5' },
                    { value: 10, label: '10' }
                  ]}
                />
                <Text size="xs" ta="center">{radius} miles</Text>
              </>
            )}

            <Button variant="filled" size="xs" onClick={applyFilters}>
              Apply Filters
            </Button>
          </Stack>
        </Popover.Dropdown>
      </Popover>

      {/* CHANGED: the “All Properties” button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAllPropertiesClick}
        loading={isLoading}
      >
        All Properties
      </Button>
    </div>
  );
}
