"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGeocode } from "@/components/search/GeocodeContext";
import { useBounds } from "@/components/search/boundscontext";
import SearchFilters from "@/components/search/SearchFilters";
import SearchInput from "@/components/search/SearchInput";
import PropertyList from "@/components/paragon/PropertyList";
import type { SearchResultsMapProps } from "@/components/search/SearchResultsMap";

// Dynamically import the map so it only renders client‐side
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

  const { setGeocodeData, geocodeData } = useGeocode();
  const { setBounds } = useBounds();
  const searchParams = useSearchParams();

  // Get the raw search term from URL if present
  const rawSearchTerm = searchParams.get("searchTerm") || "";

  // ----------------------------------------------------------------
  // Parse geocode=... from URL and update context
  // ----------------------------------------------------------------
  useEffect(() => {
    const geocodeStr = searchParams.get("geocode");
    if (geocodeStr) {
      try {
        const decoded = decodeURIComponent(geocodeStr);
        const parsed = JSON.parse(decoded);
        // Mark that this geocode data came from a redirect
        parsed.isFromRedirect = true;
        console.log("[Search Page] parsed geocode from URL =>", parsed);
        setGeocodeData(parsed);
        if (parsed.bounds) setBounds(parsed.bounds);
      } catch (err) {
        console.error("[Search Page] Error parsing geocode param:", err);
      }
    }
  }, [searchParams, setGeocodeData, setBounds]);

  // ----------------------------------------------------------------
  // Whenever the URL changes, fetch properties
  // ----------------------------------------------------------------
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
  }, [searchParams]);

  // ----------------------------------------------------------------
  // fetchProperties
  // ----------------------------------------------------------------
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

  // ----------------------------------------------------------------
  // Handle inline search from within /search
  // ----------------------------------------------------------------
  const handlePlaceSelected = (geo: any) => {
    console.log("[Search] handlePlaceSelected =>", geo);
    if (!geo || !geo.address_components) {
      console.warn("[Search] handlePlaceSelected => invalid geocode data => skipping fetch");
      return;
    }
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
    // Handle filter changes if needed
  };

  // ----------------------------------------------------------------
  // DRAGGABLE BOTTOM SHEET (Mobile Only)
  // ----------------------------------------------------------------
  // The outer container is locked (100vh, overflow-hidden, overscrollBehavior: "contain").
  // The map always fills the container.
  // The bottom sheet (property list) is anchored at the bottom.
  // Its height (as a percentage) is controlled by panelHeightPct.
  // Allowed range: minimum 35% to maximum 100%.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [panelHeightPct, setPanelHeightPct] = useState(35); // default = 35%

  // Use refs to track dragging state
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startPanelHeightRef = useRef(0);

  // Use a threshold to ignore very tiny moves (1% of container height)
  const DRAG_THRESHOLD_PCT = 1;

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    draggingRef.current = true;
    startYRef.current = "touches" in e ? e.touches[0].clientY : e.clientY;
    startPanelHeightRef.current = panelHeightPct;
    // Cast the current target as HTMLElement to access style
    (e.currentTarget as HTMLElement).style.touchAction = "none";
    (e.currentTarget as HTMLElement).style.userSelect = "none";
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const currentY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const delta = startYRef.current - currentY; // positive = upward drag
    const containerHeight = containerRef.current.getBoundingClientRect().height;
    const deltaPct = (delta / containerHeight) * 100;
    if (Math.abs(deltaPct) < DRAG_THRESHOLD_PCT) return;
    let newPanelHeight = startPanelHeightRef.current + deltaPct;
    // Clamp between 35% and 100%
    newPanelHeight = Math.max(35, Math.min(100, newPanelHeight));
    setPanelHeightPct(newPanelHeight);
  };

  const handleDragEnd = () => {
    draggingRef.current = false;
  };

  return (
    <main
      ref={containerRef}
      className="flex flex-col w-full h-screen overflow-hidden"
      style={{ overscrollBehavior: "contain" }}
    >
      {/* Top bar: search input and filters */}
      <div className="flex flex-wrap w-full p-4 gap-4 bg-gray-100 shadow-md z-10">
        <SearchInput
          defaultValue={rawSearchTerm}
          size="sm"
          onPlaceSelected={handlePlaceSelected}
          isRedirectEnabled={false}
        />
        <SearchFilters onUpdate={handleFiltersUpdate} />
      </div>

      {/* Content area */}
      <div className="relative flex-grow w-full">
        {/* Map Panel: always fills the container (background) */}
        <div className="absolute top-0 left-0 w-full h-full">
          <SearchResultsMapNoSSR properties={filteredProperties} isPropertiesLoading={loading} />
        </div>

        {/* Draggable Divider: a 35px grab area, anchored at the top edge of the bottom sheet */}
        <div
          className="absolute left-0 w-full bg-gray-300 cursor-row-resize lg:hidden"
          style={{
            height: "35px",
            bottom: `${panelHeightPct}%`,
            zIndex: 20,
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
        ></div>

        {/* Properties Panel (Bottom Sheet), anchored at the bottom */}
        <div
          className="absolute left-0 w-full overflow-y-auto bg-white shadow-inner"
          style={{
            bottom: 0,
            height: `${panelHeightPct}%`,
            WebkitOverflowScrolling: "touch",
            zIndex: 30,
          }}
        >
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
