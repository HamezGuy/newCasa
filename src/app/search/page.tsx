import SearchInput from "@/components/core/SearchInput";
import {
  SearchResults,
  SearchResultsLoading,
} from "@/components/search/SearchResults";
import { Text } from "@mantine/core";
import { Suspense } from "react";

export default async function Search({
  searchParams,
}: {
  searchParams?: { s?: string };
}) {
  return (
    <main>
      <div className="flex flex-row gap-3 w-full max-w-xl">
        <SearchInput />
      </div>
      <Text size="sm">(Only Zip Code search works right now)</Text>

      {searchParams?.s && (
        <Suspense fallback={<SearchResultsLoading />}>
          <SearchResults query={searchParams.s} />
        </Suspense>
      )}
    </main>
  );
}
