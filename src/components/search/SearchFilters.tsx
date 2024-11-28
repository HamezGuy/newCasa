'use client';

import { compareArrays } from '@/lib/utils/helpers';
import {
  Button,
  Checkbox,
  Popover,
  SegmentedControl,
  TextInput,
} from '@mantine/core';
import { useDebounceCallback } from '@mantine/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SearchFilters({
  isLoading,
  onUpdate,
}: {
  isLoading?: boolean;
  onUpdate?: (p: any) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saleOrRent, setSaleOrRent] = useState(searchParams.get('rent'));
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice'));
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice'));
  const [types, setTypes] = useState([...searchParams.getAll('t')]);

  const debouncedSetParams = useDebounceCallback(() => {
    const params = new URLSearchParams(searchParams);

    if (saleOrRent && !params.get('rent')) {
      params.set('rent', saleOrRent);
    } else if (!saleOrRent) {
      params.delete('rent');
    }

    if (minPrice && minPrice !== params.get('minPrice')) {
      params.set('minPrice', minPrice);
    } else if (!minPrice) {
      params.delete('minPrice');
    }

    if (maxPrice && maxPrice !== params.get('maxPrice')) {
      params.set('maxPrice', maxPrice);
    } else if (!maxPrice) {
      params.delete('maxPrice');
    }

    if (types && !compareArrays(types, params.getAll('t'))) {
      params.delete('t');
      types.map((val) => params.append('t', val));
    } else if (!types) {
      params.delete('t');
    }

    router.replace(`/search?${params.toString()}`);
  }, 500);

  const handleFilterChange = (
    filterName: string,
    value: string | string[] | null
  ) => {
    switch (filterName) {
      case 'rent':
        setSaleOrRent(value as string);
        break;

      case 'minPrice':
        setMinPrice(value as string);
        break;

      case 'maxPrice':
        setMaxPrice(value as string);
        break;

      case 'type':
        setTypes(value as string[]);
        break;

      default:
        break;
    }

    debouncedSetParams();
  };

  return (
    <>
      {/* Sale or Rent */}
      <SegmentedControl
        value={saleOrRent == 'y' ? 'rent' : 'sale'}
        onChange={(e) => handleFilterChange('rent', e == 'rent' ? 'y' : null)}
        data={[
          { label: 'For Sale', value: 'sale' },
          { label: 'For Rent', value: 'rent' },
        ]}
      />
      {/* Price */}
      <Popover width={300} trapFocus position="bottom" withArrow shadow="md">
        <Popover.Target>
          <Button>Any Price</Button>
        </Popover.Target>
        <Popover.Dropdown display="flex">
          <TextInput
            value={minPrice ?? ''}
            label="Minimum"
            placeholder="Mininum Price"
            type="number"
            size="xs"
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
          />
          <TextInput
            value={maxPrice ?? ''}
            label="Maximum"
            placeholder="Maximum Price"
            type="number"
            size="xs"
            ml="xs"
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
          />
        </Popover.Dropdown>
      </Popover>
      {/* Type */}
      <Popover width={300} trapFocus position="bottom" withArrow shadow="md">
        <Popover.Target>
          <Button>Any Type</Button>
        </Popover.Target>
        <Popover.Dropdown>
          <Checkbox.Group
            value={types}
            onChange={(e) => handleFilterChange('type', e)}
          >
            <Checkbox value="house" label="House" mb="sm" />
            <Checkbox value="townhouse" label="Townhouse" mb="sm" />
            <Checkbox value="condo" label="Condo" mb="sm" />
            <Checkbox value="co-op" label="Co-op" mb="sm" />
            <Checkbox value="multi-family" label="Multi-family" mb="sm" />
            <Checkbox value="lot" label="Lots / Land" mb="sm" />
            <Checkbox
              value="manufactured"
              label="Mobile / Manufactured"
              mb="sm"
            />
            <Checkbox value="commercial" label="Commercial" mb="sm" />
            <Checkbox value="other" label="Other" mb="sm" />
          </Checkbox.Group>
        </Popover.Dropdown>
      </Popover>
      {/* More */}
      <Button variant="outline">More filters</Button>
    </>
  );
}
