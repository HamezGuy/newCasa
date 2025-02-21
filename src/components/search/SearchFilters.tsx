"use client";

import { Button, Checkbox, Popover, TextInput, Stack } from "@mantine/core";
import { useState, useEffect } from "react";
import { useFilters } from "./FilterContext";

export default function SearchFilters({ isLoading }: { isLoading?: boolean }) {
  const { filters, setFilters } = useFilters();

  // Local states
  const [minPrice, setMinPrice] = useState(filters.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice ?? "");
  const [types, setTypes] = useState<string[]>(filters.types ?? []);
  const [minRooms, setMinRooms] = useState(filters.minRooms ?? "");
  const [maxRooms, setMaxRooms] = useState(filters.maxRooms ?? "");

  useEffect(() => {
    setMinPrice(filters.minPrice ?? "");
    setMaxPrice(filters.maxPrice ?? "");
    setTypes(filters.types ?? []);
    setMinRooms(filters.minRooms ?? "");
    setMaxRooms(filters.maxRooms ?? "");
  }, [filters]);

  const [opened, setOpened] = useState(false);

  const applyFilters = () => {
    setFilters({
      minPrice,
      maxPrice,
      types,
      minRooms,
      maxRooms,
    });
    setOpened(false);
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

            <Button variant="filled" size="xs" onClick={applyFilters}>
              Apply Filters
            </Button>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
