import { getPropertiesBySearchTerm } from "@/lib/data";
import PropertyList from "../paragon/PropertyList";

export async function SearchResults({ query }: { query: string }) {
  const properties = await getPropertiesBySearchTerm(query);

  if (!properties) return <div>Nothing found</div>;

  return <PropertyList properties={properties} />;
}

export function SearchResultsLoading() {
  return <div>Searching...</div>;
}
