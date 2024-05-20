"use client";
import IParagonProperty from "@/types/IParagonProperty";
import PropertySearchResultCard from "./PropertySearchResultCard";

export default function PropertyList({
  properties,
  className,
}: {
  properties?: IParagonProperty[] | null;
  className?: string;
}) {
  //TODO: Pagination
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}
    >
      {properties &&
        properties.map((property) => (
          <PropertySearchResultCard
            key={property.ListingKey}
            property={property}
          />
        ))}
    </div>
  );
}
