"use client";

import { useBounds } from "@/components/search/boundscontext";
import IParagonProperty from "@/types/IParagonProperty";
import PropertySearchResultCard from "./PropertySearchResultCard";

interface PropertyGroup {
  title?: string;
  properties: IParagonProperty[];
}

interface PropertyListProps {
  properties?: IParagonProperty[];
  propertyGroups?: PropertyGroup[];
  className?: string;
  reduced?: boolean;
  searchTerm?: string; // <--- optionally pass a searchTerm
}

export default function PropertyList({
  properties,
  propertyGroups,
  className = "",
  reduced = false,
  searchTerm = "",
}: PropertyListProps) {
  const { bounds } = useBounds();

  // Combine propertyGroups if needed
  const allProps = properties || [];

  // Filter properties based on map bounds
  const filteredProperties = allProps.filter((property) => {
    // No map bounds => show all
    if (!bounds || !bounds.southwest || !bounds.northeast) {
      return true;
    }
    if (!property.Latitude || !property.Longitude) {
      return false;
    }
    const { southwest, northeast } = bounds;
    const { Latitude, Longitude } = property;
    return (
      Latitude >= southwest.lat &&
      Latitude <= northeast.lat &&
      Longitude >= southwest.lng &&
      Longitude <= northeast.lng
    );
  });

  const baseClass = reduced
    ? "grid grid-cols-1 lg:grid-cols-2 items-stretch gap-6"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch gap-6";

  // If no properties after filtering
  // Show a different message depending on whether we had a searchTerm or not
  if (filteredProperties.length === 0) {
    return (
      <div className={`${baseClass} ${className}`}>
        <p className="text-center text-gray-500 mt-4 col-span-full">
          {searchTerm
            ? "No properties match your search in the current view."
            : "No active search yet."}
        </p>
      </div>
    );
  }

  return (
    <div className={`${baseClass} ${className}`}>
      {filteredProperties.map((property) => (
        <PropertySearchResultCard
          key={property.ListingKey}
          property={property}
          size={reduced ? "sm" : "md"}
        />
      ))}
    </div>
  );
}
