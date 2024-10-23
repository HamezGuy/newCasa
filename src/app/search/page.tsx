import SearchFilters from '@/components/core/SearchFilters';
import SearchInput from '@/components/core/SearchInput';
import { searchQuery } from '@/lib/data';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Explicitly define the type of the component to avoid issues with TypeScript
const SearchResults = dynamic(() => import('@/components/search/SearchResults') as unknown as Promise<React.ComponentType<{ query: searchQuery }>>, {
  ssr: false,
});

export default function Search({
  searchParams,
}: {
  searchParams?: searchQuery;
}) {
  return (
    <main>
      <div className="flex flex-row flex-wrap gap-3 w-full items-center py-2 px-4">
        <SearchInput size="sm" />
        <SearchFilters />
      </div>

      {searchParams?.s && (
        <Suspense fallback={<div>Loading Search Results...</div>}>
          <SearchResults query={searchParams} />
        </Suspense>
      )}
    </main>
  );
}
