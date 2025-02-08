"use client";

import { compareArrays } from "@/lib/utils/helpers";
import {
  Button,
  Checkbox,
  Popover,
  SegmentedControl,
  TextInput,
  Stack,
} from "@mantine/core";
import { useDebounceCallback } from "@mantine/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchFilters({
  isLoading,
  onUpdate,
}: {
  isLoading?: boolean;
  onUpdate?: (p: any) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saleOrRent, setSaleOrRent] = useState(searchParams.get("rent"));
  // We'll move minPrice, maxPrice, and types into the popover
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice"));
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice"));
  const [types, setTypes] = useState([...searchParams.getAll("t")]);

  // Popover state to control additional filter dropdown
  const [opened, setOpened] = useState(false);

  const debouncedSetParams = useDebounceCallback(() => {
    const params = new URLSearchParams(searchParams);

    if (saleOrRent && !params.get("rent")) {
      params.set("rent", saleOrRent);
    } else if (!saleOrRent) {
      params.delete("rent");
    }

    if (minPrice && minPrice !== params.get("minPrice")) {
      params.set("minPrice", minPrice);
    } else if (!minPrice) {
      params.delete("minPrice");
    }

    if (maxPrice && maxPrice !== params.get("maxPrice")) {
      params.set("maxPrice", maxPrice);
    } else if (!maxPrice) {
      params.delete("maxPrice");
    }

    if (types && !compareArrays(types, params.getAll("t"))) {
      params.delete("t");
      types.forEach((val) => params.append("t", val));
    } else if (!types) {
      params.delete("t");
    }

    router.replace(`/search?${params.toString()}`);
  }, 500);

  const handleFilterChange = (
    filterName: string,
    value: string | string[] | null
  ) => {
    switch (filterName) {
      case "rent":
        setSaleOrRent(value as string);
        break;
      case "minPrice":
        setMinPrice(value as string);
        break;
      case "maxPrice":
        setMaxPrice(value as string);
        break;
      case "type":
        setTypes(value as string[]);
        break;
      default:
        break;
    }
    debouncedSetParams();
    if (onUpdate) onUpdate({ rent: saleOrRent, minPrice, maxPrice, types });
  };

  return (
    <div className="flex items-center gap-2">
      {/* For Sale / For Rent Segmented Control */}
      <SegmentedControl
        size="sm"
        value={saleOrRent === "y" ? "rent" : "sale"}
        onChange={(val) =>
          handleFilterChange("rent", val === "rent" ? "y" : null)
        }
        data={[
          { label: "For Sale", value: "sale" },
          { label: "For Rent", value: "rent" },
        ]}
      />

      {/* Filter Button with Popover for additional options */}
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
          >
            Filters
          </Button>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack style={{ gap: "8px" }}>
            {/* Price Inputs */}
            <TextInput
              value={minPrice ?? ""}
              label="Minimum Price"
              placeholder="Minimum Price"
              type="number"
              size="xs"
              onChange={(e) => handleFilterChange("minPrice", e.target.value)}
            />
            <TextInput
              value={maxPrice ?? ""}
              label="Maximum Price"
              placeholder="Maximum Price"
              type="number"
              size="xs"
              onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
            />

            {/* Type Checkboxes */}
            <Checkbox.Group
              value={types}
              onChange={(vals) => handleFilterChange("type", vals)}
              label="Property Type"
            >
              <Checkbox value="house" label="House" />
              <Checkbox value="townhouse" label="Townhouse" />
              <Checkbox value="condo" label="Condo" />
              <Checkbox value="co-op" label="Co-op" />
              <Checkbox value="multi-family" label="Multi-family" />
              <Checkbox value="lot" label="Lots / Land" />
              <Checkbox value="manufactured" label="Mobile / Manufactured" />
              <Checkbox value="commercial" label="Commercial" />
              <Checkbox value="other" label="Other" />
            </Checkbox.Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
