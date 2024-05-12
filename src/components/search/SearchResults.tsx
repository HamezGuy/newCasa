import { getProperties } from "@/lib/data";
import IParagonProperty from "@/types/IParagonProperty";
import PropertyList from "../paragon/PropertyList";

export async function SearchResults({ query }: { query: string }) {
  let properties: IParagonProperty[] | null = null;

  const searchResult = await getProperties(query);

  if (!searchResult.value) return <div>Nothing found</div>;

  properties = searchResult.value;

  return <PropertyList properties={properties} />;
}

export function SearchResultsLoading() {
  return <div>Searching...</div>;
}
