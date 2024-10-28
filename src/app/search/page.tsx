// src/app/search/page.tsx
import SearchFilters from '@/components/core/SearchFilters';
import SearchInput from '@/components/core/SearchInput';
import { searchQuery } from '@/lib/data';
import { Suspense, lazy } from 'react';

// Lazy load the SearchResults component
const SearchResults = lazy(() => import('@/components/search/SearchResults'));

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
