import SearchFilters from '@/components/core/SearchFilters';
import SearchInput from '@/components/core/SearchInput';
import {
  SearchResults,
  SearchResultsLoading,
} from '@/components/search/SearchResults';
import { searchQuery } from '@/lib/data';
import { Suspense } from 'react';

export default async function Search({
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
        <Suspense fallback={<SearchResultsLoading />}>
          <SearchResults query={searchParams} />
        </Suspense>
      )}
    </main>
  );
}
