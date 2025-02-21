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

  // If provided, we open a modal instead of linking
  onPropertyClick?: (property: IParagonProperty) => void;
}

export default function PropertyList({
  properties,
  propertyGroups,
  className = "",
  reduced = false,
  searchTerm = "",
  isLoading = false,
  onPropertyClick,
}: PropertyListProps) {
  const { bounds } = useBounds();
  const allProps = properties || [];

  console.log("[PropertyList] => Received properties length:", allProps.length);

  // Filter properties based on map bounds
  const filteredProperties = allProps.filter((property) => {
    if (!bounds || !bounds.southwest || !bounds.northeast) return true;
    if (!property.Latitude || !property.Longitude) return false;
    const { southwest, northeast } = bounds;
    return (
      property.Latitude >= southwest.lat &&
      property.Latitude <= northeast.lat &&
      property.Longitude >= southwest.lng &&
      property.Longitude <= northeast.lng
    );
  });

  console.log("[PropertyList] => Filtered properties length:", filteredProperties.length);

  if (filteredProperties.length === 0) {
    if (isLoading) {
      return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
          <p className="text-center text-gray-600 mt-4 col-span-full">Loading...</p>
        </div>
      );
    }
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        <p className="text-center text-gray-500 mt-4 col-span-full">
          No properties in the current view.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ height: "100%", overflowY: "auto" }}
      className={`${
        reduced
          ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
          : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      } ${className}`}
    >
      {filteredProperties.map((property) => (
        <div
          key={property.ListingKey}
          style={{ cursor: onPropertyClick ? "pointer" : "default" }}
          // We could handle the click here or pass down to the card
          onClick={() => onPropertyClick?.(property)}
        >
          <PropertySearchResultCard
            property={property}
            size={reduced ? "sm" : "md"}
            // If parent gave onPropertyClick => pass it => uses modal approach
            // Else => uses normal Link approach
            onClick={onPropertyClick ? () => onPropertyClick(property) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
