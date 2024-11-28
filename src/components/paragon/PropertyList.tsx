'use client';

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
  const baseClass = reduced
    ? 'grid grid-cols-1 lg:grid-cols-2 items-stretch gap-6'
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch gap-6';

  return (
    <div className={`${baseClass} ${className}`}>
      {properties
        ? properties.map((property) => (
            <PropertySearchResultCard
              key={property.ListingKey}
              property={property}
              size={reduced ? 'sm' : 'md'}
            />
          ))
        : propertyGroups?.map((group) => (
            <div key={group.title}>
              {group.title && <h3>{group.title}</h3>}
              {group.properties.map((property) => (
                <PropertySearchResultCard
                  key={property.ListingKey}
                  property={property}
                  size={reduced ? 'sm' : 'md'}
                />
              ))}
            </div>
          ))}
    </div>
  );
}
