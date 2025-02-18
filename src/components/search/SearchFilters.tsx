"use client";

import { Button, Checkbox, Popover, TextInput, Stack } from "@mantine/core";
import { useState, useEffect } from "react";
import { useFilters } from "./FilterContext"; // <-- NEW

// ----------------------------------------------------------------
// Component: SearchFilters
// ----------------------------------------------------------------
export default function SearchFilters({
  isLoading,
}: {
  isLoading?: boolean;
  // CHANGED: removed onUpdate since we now have a global filter store
}) {
  // NEW: We read from the global filter context
  const { filters, setFilters } = useFilters();

  // Keep local states *mirroring* the global store, so the user sees them in the UI
  // Then on "Apply", we push them back to setFilters(...) globally
  const [minPrice, setMinPrice] = useState(filters.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice ?? "");
  const [types, setTypes] = useState<string[]>(filters.types ?? []);
  const [minRooms, setMinRooms] = useState(filters.minRooms ?? "");
  const [maxRooms, setMaxRooms] = useState(filters.maxRooms ?? "");

  // If global store changes for some reason, we can sync local states
  useEffect(() => {
    setMinPrice(filters.minPrice ?? "");
    setMaxPrice(filters.maxPrice ?? "");
    setTypes(filters.types ?? []);
    setMinRooms(filters.minRooms ?? "");
    setMaxRooms(filters.maxRooms ?? "");
  }, [filters]);

  // Popover state
  const [opened, setOpened] = useState(false);

  // On "Apply", we write back to the global store
  const applyFilters = () => {
    setFilters({
      minPrice,
      maxPrice,
      types,
      minRooms,
      maxRooms,
    });
    setOpened(false); // close the popover
  };

  return (
    <div className="flex items-center gap-2">
      {/* Filter Popover */}
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
            {/* Price Inputs */}
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

            {/* Property Type => multiple selection => OR logic */}
            <Checkbox.Group
              value={types}
              onChange={(vals: string[]) => {
                setTypes(vals);
              }}
              label="Property Type"
            >
              <Checkbox value="Residential" label="House" />
              <Checkbox value="townhouse" label="Townhouse" />
              <Checkbox value="Land" label="Land" />
              <Checkbox value="Multi Family" label="Multi-family" />
              <Checkbox value="Commercial Sale" label="Commercial" />
            </Checkbox.Group>

            {/* Rooms Inputs */}
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

            {/* "Apply Filters" => store in global context */}
            <Button variant="filled" size="xs" onClick={applyFilters}>
              Apply Filters
            </Button>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
