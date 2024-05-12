"use client";
import IParagonProperty from "@/types/IParagonProperty";
import { useState } from "react";
import PropertySearchResultCard from "./PropertySearchResultCard";

export default function PropertyList({
  properties,
  className,
}: {
  properties?: IParagonProperty[] | null;
  className?: string;
}) {
  const [selectedProperty, setSelectedProperty] =
    useState<IParagonProperty | null>(null);

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}
    >
      {properties &&
        properties.map((property) => (
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
