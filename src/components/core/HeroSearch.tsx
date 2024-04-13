"use client";

import FullPropertySummary from "@/components/paragon/FullPropertySummary";
import PropertySearchResultCard from "@/components/paragon/PropertySearchResultCard";
import IParagonProperty from "@/types/IParagonProperty";
import { Button, Modal, Text, TextInput, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Image from "next/image";
import { useCallback, useState } from "react";
import styles from "./HeroSearch.module.css";

export default function HeroSearch() {
  const [opened, { open, close }] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("53705");
  const [properties, setProperties] = useState<IParagonProperty[]>([]);
  const [selectedProperty, setSelectedProperty] =
    useState<IParagonProperty | null>(null);

  // "Search"...
  const onSearchPress = useCallback(async () => {
    setIsLoading(true);

    // Call /api/reso/test...
    const url = `/api/reso/test?searchTerm=${searchTerm}`;
    const response = await fetch(url).then((response) => response.json());
    setProperties(response.value);
    setIsLoading(false);
  }, [searchTerm, setProperties, setIsLoading]);

  return (
    <div
      style={{ height: 600 }}
      className={`${styles.heroSearch} relative flex flex-col justify-center items-center p-24 text-white`}
    >
      <Image
        src="/img/home-hero3.jpg"
        alt="Cover"
        fill
        priority
        style={{ objectFit: "cover" }}
        className="brightness-75"
      />

      {/* Search Form */}
      <Title
        order={2}
        className="drop-shadow text-center text-4xl mb-4 normal-case"
      >
        Find your next home
      </Title>
      <div className="flex flex-row gap-3 w-full max-w-xl">
        <TextInput
          value={searchTerm}
          placeholder="City, Zip, Neighborhood, Address"
          onChange={(event) => setSearchTerm(event.currentTarget.value)}
          className="flex-grow"
          size="md"
          rightSectionWidth="auto"
          rightSection={
            <Button
              variant="filled"
              loading={isLoading}
              onClick={onSearchPress}
              size="md"
            >
              Search
            </Button>
          }
        />
      </div>
      <Text size="sm">(Only Zip Code search works right now)</Text>
      <Text size="sm">Click a property to view details</Text>

      {/* Search Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((property) => (
          <PropertySearchResultCard
            onClick={(property) => {
              console.log(property);
              setSelectedProperty(property);
              open();
            }}
            key={property.ListingKey}
            property={property}
          />
        ))}
      </div>

      {/* Selected Property Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title="Property Details"
        size="90%"
      >
        <FullPropertySummary property={selectedProperty!} />
      </Modal>
    </div>
  );
}
