"use client";

import { Button, TextInput } from "@mantine/core";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

export default function SearchInput({ isLoading }: { isLoading?: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchInputRef = useRef(null);

  function handleSearch() {
    if (searchInputRef.current) {
      const input = searchInputRef.current as HTMLInputElement;
      const params = new URLSearchParams(searchParams);

      if (input.value) {
        params.set("s", input.value);
      } else {
        params.delete("s");
      }

      router.replace(`/search?${params.toString()}`);
    }
  }

  return (
    <TextInput
      ref={searchInputRef}
      defaultValue={searchParams.get("s")?.toString()}
      placeholder="City, Zip, Neighborhood, Address"
      className="flex-grow"
      size="md"
      type="text"
      rightSectionWidth="auto"
      data-1p-ignore
      onKeyUp={(e) => e.key == "Enter" && handleSearch()}
      rightSection={
        <Button
          variant="filled"
          color="indigo"
          loading={isLoading}
          onClick={handleSearch}
          size="md"
        >
          Search
        </Button>
      }
    />
  );
}
