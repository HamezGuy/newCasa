"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { useGeocode } from "@/components/search/GeocodeContext";
import { useBounds } from "@/components/search/boundscontext";
import SearchFilters from "@/components/search/SearchFilters";
import SearchInput from "@/components/search/SearchInput";
import PropertyList from "@/components/paragon/PropertyList";
import type { SearchResultsMapProps } from "@/components/search/SearchResultsMap";
import PropertyModal from "@/components/property/PropertyModal";

// Dynamically import the map so it only renders client-side
const SearchResultsMapNoSSR = dynamic<SearchResultsMapProps>(
  () =>
    import("@/components/search/SearchResultsMap").then((mod) => ({
      default: mod.SearchResultsMap,
    })),
  { ssr: false }
);

/**
 * Helper function to apply filters in-memory after receiving
 * all properties from the server.
 */
function applyClientFilters(
  properties: any[],
  filters: {
    minPrice?: string;
    maxPrice?: string;
    types?: string[];
    minRooms?: string;
    maxRooms?: string;
  }
) {
  let result = [...properties];

  // 1) Price filters
  const minVal = filters.minPrice ? parseInt(filters.minPrice, 10) : 0;
  const maxVal = filters.maxPrice ? parseInt(filters.maxPrice, 10) : 0;

  if (minVal > 0) {
    result = result.filter((p) => (p.ListPrice || 0) >= minVal);
  }
  if (maxVal > 0) {
    result = result.filter((p) => (p.ListPrice || 0) <= maxVal);
  }

  // 2) Property Type => OR logic across multiple values
  if (filters.types && filters.types.length > 0) {
    const unionSet = new Set<any>();
    const loweredTypes = filters.types.map((t) => t.toLowerCase());

    loweredTypes.forEach((oneType) => {
      const partialMatches = result.filter((p) => {
        const propType = (p.PropertySubType || p.PropertyType || "").toLowerCase();
        return propType.includes(oneType);
      });
      for (const item of partialMatches) {
        unionSet.add(item);
      }
    });

    result = [...unionSet];
  }

  // 3) Rooms filter => total rooms (bed + full bath + half bath)
  const minRooms = filters.minRooms ? parseInt(filters.minRooms, 10) : 0;
  const maxRooms = filters.maxRooms ? parseInt(filters.maxRooms, 10) : 0;
  if (minRooms > 0 || maxRooms > 0) {
    result = result.filter((p) => {
      const bd = p.BedroomsTotal ?? 0;
      const bf = p.BathroomsFull ?? 0;
      const bh = p.BathroomsHalf ?? 0;
      const totalRooms = bd + bf + bh;

      if (minRooms > 0 && totalRooms < minRooms) return false;
      if (maxRooms > 0 && totalRooms > maxRooms) return false;
      return true;
    });
  }

  return result;
}

// ----------------------------------------------------------------
// Component: SearchClient
// ----------------------------------------------------------------
export default function SearchClient() {
  // Full property list from API
  const [fetchedProperties, setFetchedProperties] = useState<any[]>([]);
  // Filtered results after in-memory filtering
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter settings from <SearchFilters />
  const [filterSettings, setFilterSettings] = useState<{
    minPrice?: string;
    maxPrice?: string;
    types?: string[];
    minRooms?: string;
    maxRooms?: string;
  }>({});

  const { setGeocodeData } = useGeocode();
  const { setBounds } = useBounds();
  const searchParams = useSearchParams();

  // Mobile bottom sheet logic
  const [panelHeightPct, setPanelHeightPct] = useState(35);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startPanelHeightRef = useRef(0);
  const DRAG_THRESHOLD_PCT = 1;

  // For property modal
  const [selectedPropertyData, setSelectedPropertyData] = useState<{
    property: any;
    userRole: string;
    userUid: string | null;
    realtorEmail: string;
    realtorPhone: string;
  } | null>(null);

  const rawSearchTerm = searchParams.get("searchTerm") || "";

  // -----------------------------------------------------------
  // Parse geocode from URL (same as before)
  // -----------------------------------------------------------
  useEffect(() => {
    const geocodeStr = searchParams.get("geocode");
    if (geocodeStr) {
      try {
        const decoded = decodeURIComponent(geocodeStr);
        const parsed = JSON.parse(decoded);
        parsed.isFromRedirect = true;
        setGeocodeData(parsed);
        if (parsed.bounds) setBounds(parsed.bounds);
      } catch (err) {
        console.error("[Search Page] Error parsing geocode param:", err);
      }
    }
  }, [searchParams, setGeocodeData, setBounds]);

  // -----------------------------------------------------------
  // Whenever URL params change => fetch data from /api/v1/listings
  // -----------------------------------------------------------
  useEffect(() => {
    const zipCode = searchParams.get("zipCode") || undefined;
    const streetName = searchParams.get("streetName") || undefined;
    const city = searchParams.get("city") || undefined;
    const county = searchParams.get("county") || undefined;
    const propertyId = searchParams.get("propertyId") || undefined;

    // (Optionally parse minPrice, etc. from URL, if you also want to do server filtering)
    // e.g. const minPrice = searchParams.get("minPrice");

    fetchProperties(zipCode, streetName, city, county, propertyId);
  }, [searchParams]);

  // -----------------------------------------------------------
  // Each time we get new data OR user changes filters => re-apply
  // -----------------------------------------------------------
  useEffect(() => {
    const newFiltered = applyClientFilters(fetchedProperties, filterSettings);
    setFilteredProperties(newFiltered);
  }, [fetchedProperties, filterSettings]);

  // -----------------------------------------------------------
  // Actual fetch from server
  // (Currently ignoring user filters for server-side, but you could pass them.)
  // -----------------------------------------------------------
  const fetchProperties = async (
    zipCode?: string,
    streetName?: string,
    city?: string,
    county?: string,
    propertyId?: string
  ) => {
    setLoading(true);
    try {
      let url = "/api/v1/listings";
      const queries: string[] = [];

      if (zipCode) queries.push(`zipCode=${encodeURIComponent(zipCode)}`);
      if (streetName) queries.push(`streetName=${encodeURIComponent(streetName)}`);
      if (city) queries.push(`city=${encodeURIComponent(city)}`);
      if (county) queries.push(`county=${encodeURIComponent(county)}`);
      if (propertyId) queries.push(`propertyId=${encodeURIComponent(propertyId)}`);

      // If you wanted server-side filtering, you'd also push minPrice=..., propertyType=..., etc.
      // For now, we're letting the in-memory approach handle it.

      if (queries.length > 0) {
        url += `?${queries.join("&")}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        console.error("[Search Page] fetchProperties => error:", await response.text());
        setFetchedProperties([]);
      } else {
        const data = await response.json();
        setFetchedProperties(data);
      }
    } catch (error) {
      console.error("[Search Page] fetchProperties => exception:", error);
      setFetchedProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Called when user selects a place in the <SearchInput>
  const handlePlaceSelected = (geo: any) => {
    // This runs when the user picks from autocomplete
    // or we can do nothing. The "Search" logic is in <SearchInput>.
  };

  // Called when <SearchFilters> changes
  const handleFiltersUpdate = useCallback((filters: any) => {
    setFilterSettings(filters);
  }, []);

  // -----------------------------------------------------------
  // Mobile bottom sheet drag
  // (unchanged)
  // -----------------------------------------------------------
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    draggingRef.current = true;
    startYRef.current = "touches" in e ? e.touches[0].clientY : e.clientY;
    startPanelHeightRef.current = panelHeightPct;
    (e.currentTarget as HTMLElement).style.touchAction = "none";
    (e.currentTarget as HTMLElement).style.userSelect = "none";
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const currentY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const delta = startYRef.current - currentY;
    const containerHeight = containerRef.current.getBoundingClientRect().height;
    const deltaPct = (delta / containerHeight) * 100;
    if (Math.abs(deltaPct) < DRAG_THRESHOLD_PCT) return;

    let newPanelHeight = startPanelHeightRef.current + deltaPct;
    newPanelHeight = Math.max(35, Math.min(100, newPanelHeight));
    setPanelHeightPct(newPanelHeight);
  };

  const handleDragEnd = () => {
    draggingRef.current = false;
  };

  // -----------------------------------------------------------
  // On property click => open modal
  // -----------------------------------------------------------
  const handlePropertyClick = (property: any) => {
    const userRole = "user";
    const userUid = null;
    const realtorEmail = property.ListAgentEmail || "realtor@example.com";
    const realtorPhone = property.ListAgentPreferredPhone || "123-456-7890";
    setSelectedPropertyData({
      property,
      userRole,
      userUid,
      realtorEmail,
      realtorPhone,
    });
  };

  return (
    <main
      ref={containerRef}
      className="flex flex-col w-full h-screen overflow-hidden min-h-0"
      style={{ overscrollBehavior: "contain" }}
    >
      {/* TOP BAR => search input + filter controls */}
      <div className="flex-shrink-0 bg-gray-100 p-2 shadow-md z-10">
        <div className="max-w-screen-xl mx-auto flex justify-between items-center gap-2">
          {/* We pass our filterSettings to SearchInput via `filters` */}
          <SearchInput
            defaultValue={rawSearchTerm}
            size="sm"
            onPlaceSelected={handlePlaceSelected}
            isRedirectEnabled={false}
            filters={filterSettings} // <--- NEW
          />
          <SearchFilters onUpdate={handleFiltersUpdate} />
        </div>
      </div>

      {/* MAIN CONTENT => map + property list */}
      <div className="flex-grow relative flex flex-row min-h-0 overflow-hidden">
        {/* DESKTOP => left side: map, right side: property list */}
        <div className="hidden lg:block relative w-2/3 h-full min-h-0">
          <SearchResultsMapNoSSR
            properties={filteredProperties}
            isPropertiesLoading={loading}
          />
        </div>

        {/* DESKTOP => property list => scrollable */}
        <div className="hidden lg:block w-1/3 h-full min-h-0 overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 mt-4">Loading properties...</p>
          ) : filteredProperties.length > 0 ? (
            <PropertyList
              properties={filteredProperties}
              onPropertyClick={handlePropertyClick}
            />
          ) : (
            <p className="text-center text-gray-500 mt-4">No properties found.</p>
          )}
        </div>

        {/* MOBILE => full-screen map behind bottom sheet */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-full">
          <SearchResultsMapNoSSR
            properties={filteredProperties}
            isPropertiesLoading={loading}
          />
        </div>
        <div
          className="lg:hidden absolute left-0 w-full shadow-inner bg-white"
          style={{
            bottom: 0,
            height: `${panelHeightPct}%`,
            WebkitOverflowScrolling: "touch",
            zIndex: 30,
          }}
        >
          <div style={{ height: "100%", overflowY: "auto" }}>
            {loading ? (
              <p className="text-center text-gray-500 mt-4">Loading properties...</p>
            ) : filteredProperties.length > 0 ? (
              <PropertyList
                properties={filteredProperties}
                onPropertyClick={handlePropertyClick}
              />
            ) : (
              <p className="text-center text-gray-500 mt-4">No properties found.</p>
            )}
          </div>
        </div>

        {/* MOBILE => Draggable handle */}
        <div
          className="lg:hidden absolute left-0 w-full flex justify-center items-center cursor-row-resize"
          style={{
            height: "35px",
            bottom: `${panelHeightPct}%`,
            zIndex: 40,
            touchAction: "none",
            userSelect: "none",
          }}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <div className="w-12 h-1 bg-gray-500 rounded-full"></div>
        </div>
      </div>

      {/* Property Modal */}
      {selectedPropertyData && (
        <PropertyModal
          opened={!!selectedPropertyData}
          onClose={() => setSelectedPropertyData(null)}
          property={selectedPropertyData.property}
          userRole={selectedPropertyData.userRole}
          userUid={selectedPropertyData.userUid}
          realtorEmail={selectedPropertyData.realtorEmail}
          realtorPhone={selectedPropertyData.realtorPhone}
        />
      )}
    </main>
  );
}
