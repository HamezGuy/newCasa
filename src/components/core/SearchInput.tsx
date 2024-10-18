'use client';

import { Button, MantineSize, TextInput } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';

export default function SearchInput({
  isLoading,
  size = 'md',
}: {
  isLoading?: boolean;
  size?: MantineSize;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchInputRef = useRef(null);

  function handleSearch() {
    if (searchInputRef.current) {
      const input = searchInputRef.current as HTMLInputElement;

      // Convert ReadonlyURLSearchParams to a string before passing to URLSearchParams
      const params = new URLSearchParams(searchParams.toString());

      if (input.value) {
        params.set('s', input.value);
      } else {
        params.delete('s');
      }

      router.replace(`/search?${params.toString()}`);
    }
  }

  return (
    <TextInput
      ref={searchInputRef}
      defaultValue={searchParams.get('s')?.toString()}
      placeholder="City, Zip, Neighborhood, Address"
      className="flex-grow"
      size={size}
      miw="280"
      maw="500"
      type="text"
      rightSectionWidth="auto"
      data-1p-ignore
      onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
      rightSection={
        <Button
          variant="filled"
          loading={isLoading}
          onClick={handleSearch}
          size={size}
        >
          Search
        </Button>
      }
    />
  );
}
