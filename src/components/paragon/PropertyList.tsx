'use client';

import { useBounds } from '@/components/search/boundscontext'; // Import BoundsContext
import IParagonProperty from '@/types/IParagonProperty';
import PropertySearchResultCard from './PropertySearchResultCard';

interface PropertyGroup {
  title?: string;
  properties: IParagonProperty[];
}

interface PropertyListProps {
  properties?: IParagonProperty[];
  propertyGroups?: PropertyGroup[];
  className?: string;
  reduced?: boolean;
}

export default function PropertyList({
  properties,
  propertyGroups,
  className,
  reduced = false,
}: PropertyListProps) {
  const { bounds } = useBounds(); // Access bounds from context

  // Filter properties based on the current bounds
  const filteredProperties = properties?.filter((property) => {
    if (
      !property.Latitude ||
      !property.Longitude ||
      !bounds ||
      !bounds.southwest ||
      !bounds.northeast
    ) {
      return false;
    }
    const { southwest, northeast } = bounds;
    const { Latitude, Longitude } = property;

    // Check if the property is within bounds
    return (
      Latitude >= southwest.lat &&
      Latitude <= northeast.lat &&
      Longitude >= southwest.lng &&
      Longitude <= northeast.lng
    );
  });

  const baseClass = reduced
    ? 'grid grid-cols-1 lg:grid-cols-2 items-stretch gap-6'
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch gap-6';

  return (
    <div className={`${baseClass} ${className}`}>
      {filteredProperties && filteredProperties.length > 0 ? (
        filteredProperties.map((property) => (
          <PropertySearchResultCard
            key={property.ListingKey}
            property={property}
            size={reduced ? 'sm' : 'md'}
          />
        ))
      ) : (
        <p className="text-center text-gray-500 mt-4">No properties in the current view.</p>
      )}
    </div>
  );
}
