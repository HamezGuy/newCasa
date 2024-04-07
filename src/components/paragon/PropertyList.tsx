"use client";
import IParagonProperty from "@/types/IParagonProperty";
import { useEffect, useState } from "react";
import PropertySearchResultCard from "./PropertySearchResultCard";

export default function PropertyList({
  searchTerm = "53705",
  className,
}: {
  searchTerm?: string;
  className?: string;
}) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [properties, setProperties] = useState<IParagonProperty[]>([]);
  const [selectedProperty, setSelectedProperty] =
    useState<IParagonProperty | null>(null);

  async function fetchProperties() {
    // Call /api/reso/test...
    const url = `/api/reso/test?searchTerm=${searchTerm}`;
    const response = await fetch(url).then((response) => response.json());
    setProperties(response.value);
  }

  // "Search"...
  useEffect(() => {
    fetchProperties();
    setIsLoading(false);
  }, []);

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}
    >
      {properties.map((property) => (
        <PropertySearchResultCard
          onClick={(property) => {
            console.log(property);
            setSelectedProperty(property);
            // open();
          }}
          key={property.ListingKey}
          property={property}
        />
      ))}
    </div>
  );
}
