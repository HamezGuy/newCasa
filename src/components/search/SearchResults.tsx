// src/components/search/SearchResults.tsx
"use client";

import { getPropertiesByQuery, searchQuery } from '@/lib/data';
import IParagonProperty from '@/types/IParagonProperty';
import { useEffect, useState } from 'react';
import PropertyList from '../paragon/PropertyList';
import style from './SearchResults.module.css';
import { SearchResultsMap } from './SearchResultsMap';

interface SearchResultsProps {
  query: searchQuery;
}

function SearchResults({ query }: SearchResultsProps) {
  const [properties, setProperties] = useState<IParagonProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      const result = await getPropertiesByQuery(query);
      setProperties(result || []);
      setLoading(false);
    };
    fetchProperties();
  }, [query]);

  if (loading) return <div>Loading...</div>;
  if (!properties || properties.length === 0) return <div>Nothing found</div>;

  return (
    <div className={`${style.searchResults} md:flex`}>
      <div className={`${style.searchResultsMap} relative flex-auto md:basis-7/12`}>
        <SearchResultsMap properties={properties} />
      </div>
      <div className="basis-5/12 overflow-y-scroll">
        <PropertyList properties={properties} reduced={true} className="p-4" />
      </div>
    </div>
  );
}

export default SearchResults;
