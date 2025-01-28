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
  searchTerm?: string;
  isLoading?: boolean;
}

export default function PropertyList({
  properties,
  propertyGroups,
  className = "",
  reduced = false,
  searchTerm = "",
  isLoading = false,
}: PropertyListProps) {
  const { bounds } = useBounds();

  const allProps = properties || [];

  console.log("[PropertyList] => Received properties length:", allProps.length);

  const filteredProperties = allProps.filter((property) => {
    if (!bounds || !bounds.southwest || !bounds.northeast) {
      return true;
    }
    if (!property.Latitude || !property.Longitude) {
      return false;
    }
    const { southwest, northeast } = bounds;
    return (
      property.Latitude >= southwest.lat &&
      property.Latitude <= northeast.lat &&
      property.Longitude >= southwest.lng &&
      property.Longitude <= northeast.lng
    );
  });

  console.log("[PropertyList] => Filtered properties length:", filteredProperties.length);

  // For each property, log if there's Media or not
  filteredProperties.forEach((p: any) => {
    const hasMedia = p.Media && p.Media.length ? p.Media.length : 0;
    console.log(`[PropertyList] => ListingKey=${p.ListingKey} => hasMedia=${hasMedia}`);
  });

  const baseClass = reduced
    ? "grid grid-cols-1 lg:grid-cols-2 items-stretch gap-6"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch gap-6";

  if (filteredProperties.length === 0) {
    if (isLoading) {
      return (
        <div className={`${baseClass} ${className}`}>
          <p className="text-center text-gray-600 mt-4 col-span-full">
            Loading...
          </p>
        </div>
      );
    }
    return (
      <div className={`${baseClass} ${className}`}>
        <p className="text-center text-gray-500 mt-4 col-span-full">
          No properties in the current view.
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
