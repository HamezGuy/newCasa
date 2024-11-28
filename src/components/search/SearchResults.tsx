'use client';

import PropertyList from '@/components/paragon/PropertyList';
import paragonApiClient from '@/lib/ParagonApiClient';
import IParagonProperty from '@/types/IParagonProperty';
import { useEffect, useState } from 'react';
import style from './SearchResults.module.css';
import { SearchResultsMap } from './SearchResultsMap';

interface SearchResultsProps {
  query: { zipCode?: string; filters?: any }; // Adjust the query type as needed
}

function SearchResults({ query }: SearchResultsProps) {
  const [properties, setProperties] = useState<IParagonProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProperties() {
      try {
        if (query.zipCode) {
          const results = await paragonApiClient.searchByZipCode(query.zipCode);
          setProperties(results.value || []);
        } else {
          const allProperties = await paragonApiClient.getAllPropertyWithMedia();
          setProperties(allProperties || []);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, [query]);

  if (loading) return <div>Loading...</div>;
  if (!properties || properties.length === 0) return <div>Nothing found</div>;

  return (
    <div className={`${style.searchResults} md:flex`}>
      {/* Map View */}
      <div className={`${style.searchResultsMap} relative flex-auto md:basis-7/12`}>
        <SearchResultsMap properties={properties} />
      </div>

      {/* Property List */}
      <div className="basis-5/12 overflow-y-scroll">
        <PropertyList properties={properties} reduced={true} className="p-4" />
      </div>
    </div>
  );
}

export default SearchResults;
