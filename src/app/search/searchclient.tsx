// File: components/search/SearchClient.tsx
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
import PropertyModal from "@/components/property/PropertyModal";

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

  // NEW: State to track whether the property panel is being interacted with (scrolled).
  const [isPanelInteracting, setIsPanelInteracting] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State for property modal popup
  const [selectedPropertyData, setSelectedPropertyData] = useState<{
    property: any;
    userRole: string;
    userUid: string | null;
    realtorEmail: string;
    realtorPhone: string;
  } | null>(null);

  // When the property list scrolls, we mark interaction for a short period.
  const handlePanelScroll = () => {
    setIsPanelInteracting(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsPanelInteracting(false);
    }, 200);
  };

  // Get the raw search term from URL if present.
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
        // Mark that this geocode data came from a redirect.
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
  // Whenever the URL changes, fetch properties.
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
      if (queries.length > 0) url += `?${queries.join("&")}`;
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
    const county = comps.find((c: any) => c.types.includes("administrative_area_level_2"))?.long_name;
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
    setIsPanelInteracting(true);
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
    setIsPanelInteracting(false);
  };

  // ----------------------------------------------------------------
  // When a property is clicked in the list, open the modal
  // ----------------------------------------------------------------
  const handlePropertyClick = (property: any) => {
    // For demonstration, assume user role and uid are known or derived
    const userRole = "user"; // you may get this from your auth context
    const userUid = null; // set actual uid if available
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
        {/* Map Panel (background) */}
        <div className="absolute top-0 left-0 w-full h-full">
          <SearchResultsMapNoSSR
            properties={filteredProperties}
            isPropertiesLoading={loading}
          />
        </div>

        {/* Draggable Divider for Mobile */}
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

        {/* Properties Panel (Bottom Sheet) */}
        <div
          className="absolute left-0 w-full shadow-inner bg-white"
          style={{
            bottom: 0,
            height: `${panelHeightPct}%`,
            WebkitOverflowScrolling: "touch",
            zIndex: 30,
          }}
        >
          <div style={{ height: "100%", overflowY: "auto" }} onScroll={handlePanelScroll}>
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
      </div>

      {/* Render the Property Modal if a property is selected */}
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
