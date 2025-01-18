"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useGeocode } from "@/components/search/GeocodeContext";
import { useBounds } from "@/components/search/boundscontext";
import SearchFilters from "@/components/search/SearchFilters";
import SearchInput from "@/components/search/SearchInput";
import PropertyList from "@/components/paragon/PropertyList";
import type { SearchResultsMapProps } from "@/components/search/SearchResultsMap";

const GoogleMapsClientProviderNoSSR = dynamic(
  () => import("@/components/core/GoogleMapsClientProvider"),
  { ssr: false }
);

const SearchResultsMapNoSSR = dynamic<SearchResultsMapProps>(
  () =>
    import("@/components/search/SearchResultsMap").then((mod) => ({
      default: mod.SearchResultsMap,
    })),
  { ssr: false }
);

export default function SearchClient() {
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { setGeocodeData } = useGeocode();
  const { setBounds } = useBounds();
  const searchParams = useSearchParams();

  // raw typed text from URL if "searchTerm=..."
  const rawSearchTerm = searchParams.get("searchTerm") || "";

  // ------------------------------
  // fetchProperties
  // ------------------------------
  const fetchProperties = async (
    zipCode?: string,
    streetName?: string,
    city?: string,
    county?: string
  ) => {
    setLoading(true);
    try {
      let url = "/api/v1/listings";
      const queries: string[] = [];
      if (zipCode) queries.push(`zipCode=${encodeURIComponent(zipCode)}`);
      if (streetName) queries.push(`streetName=${encodeURIComponent(streetName)}`);
      if (city) queries.push(`city=${encodeURIComponent(city)}`);
      if (county) queries.push(`county=${encodeURIComponent(county)}`);

      if (queries.length > 0) {
        url += `?${queries.join("&")}`;
      }

      console.log("[Search Page] fetchProperties =>", url);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log("[Search Page] fetchProperties => data:", data);
        setFilteredProperties(data);
      } else {
        console.error("[Search Page] fetchProperties => error:", await response.text());
        setFilteredProperties([]);
      }
    } catch (error) {
      console.error("[Search Page] fetchProperties => exception:", error);
      setFilteredProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // parse geocode=... from URL
  // ------------------------------
  useEffect(() => {
    const geocodeStr = searchParams.get("geocode");
    if (geocodeStr) {
      try {
        const decoded = decodeURIComponent(geocodeStr);
        const parsed = JSON.parse(decoded);
        console.log("[Search Page] parsed geocode from URL =>", parsed);
        setGeocodeData(parsed);
        if (parsed.bounds) setBounds(parsed.bounds);
      } catch (err) {
        console.error("[Search Page] Error parsing geocode param:", err);
      }
    }
  }, [searchParams, setGeocodeData, setBounds]);

  // ------------------------------
  // Whenever the user’s URL changes, fetch
  // ------------------------------
  useEffect(() => {
    const zipCode = searchParams.get("zipCode") || undefined;
    const streetName = searchParams.get("streetName") || undefined;
    const city = searchParams.get("city") || undefined;
    const county = searchParams.get("county") || undefined;

    if (!zipCode && !streetName && !city && !county) {
      console.log("[Search Page] No query param => fetch all");
      fetchProperties();
    } else {
      fetchProperties(zipCode, streetName, city, county);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ------------------------------
  // If user does a new search from within /search page => inline fetch
  // ------------------------------
  const handlePlaceSelected = (geo: any) => {
    console.log("[Search] handlePlaceSelected =>", geo);
    if (!geo || !geo.address_components) {
      console.warn("[Search] handlePlaceSelected => invalid geocode data => skipping fetch");
      return;
    }
    // parse geocode comps
    const comps = geo.address_components;
    const zipCode = comps.find((c: any) => c.types.includes("postal_code"))?.long_name;
    const route = comps.find((c: any) => c.types.includes("route"))?.long_name;
    const city = comps.find((c: any) => c.types.includes("locality"))?.long_name;
    const county = comps.find((c: any) =>
      c.types.includes("administrative_area_level_2")
    )?.long_name;

    if (zipCode) {
      fetchProperties(zipCode);
    } else if (route) {
      fetchProperties(undefined, route);
    } else if (city) {
      fetchProperties(undefined, undefined, city);
    } else if (county) {
      fetchProperties(undefined, undefined, undefined, county);
    } else {
      console.log("[Search] handlePlaceSelected => no recognized param => fetch all");
      fetchProperties();
    }
  };

  const handleFiltersUpdate = (filters: any) => {
    console.log("[Search] handleFiltersUpdate =>", filters);
    // handle filters if needed
  };

  return (
    <main className="flex flex-col w-full h-screen">
      {/* Top bar => user can do a new search or use filters */}
      <div className="flex flex-wrap w-full p-4 gap-4 bg-gray-100 shadow-md z-10">
        <SearchInput
          defaultValue={rawSearchTerm}
          size="sm"
          onPlaceSelected={handlePlaceSelected}
          isRedirectEnabled={false} // no redirect => inline fetch
        />
        <SearchFilters onUpdate={handleFiltersUpdate} />
      </div>

      <div className="flex flex-grow w-full h-full">
        {/* Left side => MAP */}
        <div className="w-full lg:w-2/3 h-full">
          <GoogleMapsClientProviderNoSSR>
            <SearchResultsMapNoSSR
              properties={filteredProperties}
              isPropertiesLoading={loading} // pass loading => map overlay
            />
          </GoogleMapsClientProviderNoSSR>
        </div>

        {/* Right side => Property List */}
        <div className="w-full lg:w-1/3 h-full overflow-y-auto p-4 bg-white shadow-inner">
          {loading ? (
            <p className="text-center text-gray-500 mt-4">Loading properties...</p>
          ) : filteredProperties.length > 0 ? (
            <PropertyList properties={filteredProperties} />
          ) : (
            <p className="text-center text-gray-500 mt-4">No properties found.</p>
          )}
        </div>
      </div>
    </main>
  );
}
