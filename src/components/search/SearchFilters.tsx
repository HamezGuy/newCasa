"use client";

import { Button, Checkbox, Popover, TextInput, Stack } from "@mantine/core";
import { useState } from "react";

export default function SearchFilters({
  isLoading,
  onUpdate,
}: {
  isLoading?: boolean;
  onUpdate?: (p: any) => void;
}) {
  // Price filter states
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Property type filter => If user selects multiple, we do an OR match
  const [types, setTypes] = useState<string[]>([]);

  // Room filter states (optional)
  const [minRooms, setMinRooms] = useState("");
  const [maxRooms, setMaxRooms] = useState("");

  // Popover state
  const [opened, setOpened] = useState(false);

  // Helper to push updated filters up to the parent
  const emitFilters = () => {
    const filters = {
      minPrice,
      maxPrice,
      types,
      minRooms,
      maxRooms,
    };
    if (onUpdate) onUpdate(filters);
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
              onBlur={emitFilters}
            />
            <TextInput
              value={maxPrice}
              label="Maximum Price"
              placeholder="Max Price"
              type="number"
              size="xs"
              onChange={(e) => setMaxPrice(e.target.value)}
              onBlur={emitFilters}
            />

            {/* Property Type => multiple selection => OR logic */}
            <Checkbox.Group
              value={types}
              onChange={(vals: string[]) => {
                setTypes(vals);
                setTimeout(emitFilters, 0); 
              }}
              label="Property Type"
            >
              <Checkbox value="house" label="House" />
              <Checkbox value="townhouse" label="Townhouse" />
              <Checkbox value="condo" label="Condo" />
              <Checkbox value="co-op" label="Co-op" />
              <Checkbox value="multi-family" label="Multi-family" />
              <Checkbox value="lot" label="Lots/Land" />
              <Checkbox value="manufactured" label="Mobile/Manufactured" />
              <Checkbox value="commercial" label="Commercial" />
              <Checkbox value="other" label="Other" />
            </Checkbox.Group>

            {/* Rooms Inputs */}
            <TextInput
              value={minRooms}
              label="Min. Rooms"
              type="number"
              size="xs"
              onChange={(e) => setMinRooms(e.target.value)}
              onBlur={emitFilters}
            />
            <TextInput
              value={maxRooms}
              label="Max. Rooms"
              type="number"
              size="xs"
              onChange={(e) => setMaxRooms(e.target.value)}
              onBlur={emitFilters}
            />
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
