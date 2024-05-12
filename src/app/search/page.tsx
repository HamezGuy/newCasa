import SearchInput from "@/components/core/SearchInput";
import PropertyList from "@/components/paragon/PropertyList";
import IParagonProperty from "@/types/IParagonProperty";
import { Text } from "@mantine/core";

async function getProperties(searchTerm: string) {
  // const url = `/api/reso/test?searchTerm=${searchTerm}`;
  // const res = await fetch(url);

  // if (!res.ok) {
  //   throw new Error(`Failed to search for ${searchTerm}`);
  // }

  console.log("in getProperties", searchTerm);
  return [];
}

export default async function Search({
  searchParams,
}: {
  searchParams?: { s?: string };
}) {
  const searchTerm = searchParams?.s || "";
  let properties: IParagonProperty[] | null = null;

  if (searchParams?.s) {
    // setIsLoading(true);
    const searchResult = await getProperties(searchParams.s);
    properties = searchResult;
    // setIsLoading(false);
  }

  return (
    <main>
      {/* Search Form */}
      <div className="flex flex-row gap-3 w-full max-w-xl">
        <SearchInput />
      </div>
      <Text size="sm">(Only Zip Code search works right now)</Text>
      <Text size="sm">Click a property to view details</Text>

      {properties?.length && <PropertyList />}
    </main>
  );
}
