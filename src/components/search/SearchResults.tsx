// src/components/search/SearchResults.tsx
import { getPropertiesByQuery, searchQuery } from '@/lib/data';
import PropertyList from '../paragon/PropertyList';
import style from './SearchResults.module.css';
import { ResultsMap } from './SearchResultsMap';

async function SearchResults({ query }: { query: searchQuery }) {
  const properties = await getPropertiesByQuery(query);

  if (!properties || properties.length === 0) return <div>Nothing found</div>;

  return (
    <div className={`${style.searchResults} md:flex`}>
      <div className={`${style.searchResultsMap} relative flex-auto md:basis-7/12`}>
        <ResultsMap properties={properties} />
      </div>
      <div className="basis-5/12 overflow-y-scroll">
        <PropertyList properties={properties} reduced={true} className="p-4" />
      </div>
    </div>
  );
}

export default SearchResults;
