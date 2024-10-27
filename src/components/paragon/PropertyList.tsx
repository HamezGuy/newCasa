'use client';
import IParagonProperty from '@/types/IParagonProperty';
import PropertySearchResultCard from './PropertySearchResultCard';

export default function PropertyList({
  properties,
  className,
  reduced = false,
}: {
  properties?: IParagonProperty[] | null;
  className?: string;
  reduced?: boolean;
}) {
  //TODO: Pagination

  const baseClass = reduced
    ? 'grid grid-cols-1 lg:grid-cols-2 items-stretch gap-6'
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch gap-6';
  return (
    <div className={`${baseClass} ${className}`}>
      {properties &&
        properties.map((property) => (
          <PropertySearchResultCard
            key={property.ListingKey}
            property={property}
            size={reduced ? 'sm' : 'md'}
          />
        ))}
    </div>
  );
}
